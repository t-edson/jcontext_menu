"use strict";

//Variables globales
var $firstblk = null;  //Contenedor principal de la expresión.
var getCaretAbsolPos = function($node){
/*Función  para leer coordenadas absolutas del cursor en edición.
Las coordenadas se devuelven en un objeto {left: 0, top: 0} en pixeles.
Basada en: http://jsfiddle.net/kevinmicke/vbucs/262/
*/
   var absPos = $node.getBoundingClientRect();  //Posición absoluta
   var offsetx = absPos.left;
   var offsety = absPos.top;
   var nodeLeft = 0,
       nodeTop = 0;
   if ($node){
        nodeLeft = $node.offsetLeft;
        nodeTop = $node.offsetTop;
   }
   var pos = {left: 0, top: 0};
   if (document.selection){
        var range = document.selection.createRange();
        pos.left = range.offsetLeft + offsetx - nodeLeft;
        pos.top = range.offsetTop + offsety - nodeTop;
   } else if (window.getSelection){
        var sel = window.getSelection();
        var range = sel.getRangeAt(0).cloneRange();
        try{
            range.setStart(range.startContainer, range.startOffset-1);
        } 
        catch(e) {}
        var rect = range.getBoundingClientRect();
        if (range.endOffset == 0 || range.toString() === '' ){
            // first char of line
            if (range.startContainer == $node) {
                // empty div
                if (range.endOffset == 0){
                    pos.left = nodeLeft;
                    pos.top = nodeTop;
                } else {
                    // firefox need this
                    var range2 = range.cloneRange();
                    range2.setStart(range2.startContainer, 0);
                    var rect2 = range2.getBoundingClientRect();
                    pos.left = rect2.left + offsetx - nodeLeft;
                    pos.top = rect2.top + rect2.height + offsety - nodeTop;
                }
            } else {
               pos.left = range.startContainer.offsetLeft;
               pos.top = range.startContainer.offsetTop;
            }
        } else {  //Hay contenido
            pos.left = rect.left + rect.width + offsetx - nodeLeft;
            pos.top = rect.top + offsety - nodeTop;  
            //Si solo va a haber una línea bastaría con: pos.top = nodeTop;
        }
   }
   return pos;
};
function set_crs(fld, pos) { 
   /* Utilidad para posicionar el cursor en un elemento editable. Se le pone un nombre
   especial para que no se confunda con otra función similar.
   "fld" es el elemento del DOM que es editable. */
   if (!fld.hasChildNodes()) return;  //Probablemente el elemento está vacío
   var range = document.createRange(); 
   var sel = window.getSelection(); 
   range.setStart(fld.childNodes[0], pos); 
   range.collapse(true); 
   sel.removeAllRanges(); 
   sel.addRange(range); 
   fld.focus(); 
}
function read_cur_command($focus) {
   /* Lee el comando actual, en el control en edición, a partir de la posición
   actual del cursor. Devuelve un arreglo con tres campos:
      [<comando actual>,<posición de inicio>,<posición final>]
   Un comando es un conjunto de caracteres alfanuméricos que empiecen con el 
   caracter "/", como por ejemplo "/titulo" o "/parrafo". 
   Parámetros:
   $focus  -> Objeto editable actual que tiene el enfoque.
   */
   var w_pos = 0;      //Desplazamiento del cursor
   if ($focus.length==0) return ['', 0, 0];  //No hay selección
   //Información del texto
   var w_txt = $focus.get(0).innerText;
   w_pos = window.getSelection().anchorOffset;  //Desplazamiento del cursor
   var cur_beg = w_pos==0?true:false;          //Bandera de posición
   var cur_end = w_pos==w_txt.length?true:false; //Bandera de posición
   var comm = w_txt.substring(0, w_pos);  //Copia hasta la posición del cursor.
   //Explora hacia atrás para buscar el "/".
   for (let i = comm.length-1; i>=0; i--) {
      var w=comm.charCodeAt(i);
      if ((w>=65 && w<=90) || (w>=97 && w<=122) || 
         (w>=48 && w<=57)) {  
         //Caracter alfabético
      } else if (w==47) {  // Caracter "/"
         //Aquí empieza el comando
         return [comm.substring(i), i, w_pos];
      } else { //Se encontró caracter no valido para comando
         return ['', 0, 0];
      }
   }   
   //No se encontró el origen del comando "/"
   return ['',0,0];
}
function filter_and_show_menu($men, curcom, $focus) {
   /* Filtra el contenido del menú y lo muestra, si es que acaso tiene más
   de un ítem visible, después del filtrado. 
   EL menú se muestra en la posición actual del cursor.
   Parámetros:
   $men    -> Objeto jquery apuntando al menú, un contenedor de <ul>.
   $curcom -> Comando actual. Empieza siempre con "/".
   $focus  -> Objeto editable actual que tiene el enfoque.
   */
   //Inicia con el filtrado.
   var filter = curcom.substring(1).toLowerCase();  //Quita el "/"
   filter = filter.replace("á", "a");
   filter = filter.replace("é", "e");
   filter = filter.replace("í", "i");
   filter = filter.replace("ó", "o");
   filter = filter.replace("ú", "u");
   var n_shown = 0;  //Elementos mostrados
   var $items=$men.find("li");
   $items.each(function () {
      var $this=$(this);
      var item_txt = $this.text().toLowerCase();
      item_txt = item_txt.replace("á", "a");
      item_txt = item_txt.replace("é", "e");
      item_txt = item_txt.replace("í", "i");
      item_txt = item_txt.replace("ó", "o");
      item_txt = item_txt.replace("ú", "u");
      if (item_txt.search(filter) > -1) {
         $this.show();
            n_shown++;
            if (n_shown==1) {  //Es el primer elemento.
               $this.addClass('act');  //Lo selecciona
            } else {
               $this.removeClass('act');
            }
      } else {
         $this.hide();
         $this.removeClass('act');  //Por si estaba activo
      }
   });
   //Posiciona y muestra el menú
   if (n_shown>0) {//Hay elementos mostrados
      //Posiciona el menú
      var pos = getCaretAbsolPos($focus[0]); //Posición del cursor
      pos.top+=$focus.height()+2;  //Corrige
      $men.css({top: pos.top, left: pos.left, position:'absolute'});
      $men.show();
   } else {
      $men.hide();
   }
}
function update_menu_vis($men) {
   /* Actualiza la posición y visibilidad del menú contextual. El comportamiento es:
   Si hay comando actual (hay palabra después del "/" que coincide con algún ítem de 
   $men), muestra el menú donde esté el cursor. En caso contrario, lo coulta si estuviera
   visible.
   Parámetros:
     $men -> Objeto jquery apuntando al menú, un contenedor de <ul>.
   */
   //Ubica comando en el editor. Lo que empiece con "/" y siga caracteres
   var $edit=$(":focus");  //Elemento seleccionado.
   var curcom = read_cur_command($edit)[0];
   //console.log(curcom);
   if (curcom=='/') {  //Inicio de comando
      //Actualiza posición del menú contextual
      filter_and_show_menu($men, curcom, $edit);
   } else if (curcom=='') {  //No hay comando
      $men.hide();
   } else {  //Hay comando
      if ($men.is(':visible')){  //El menú contextual está abierto
         //Actualiza posición del menú contextual
         filter_and_show_menu($men, curcom, $edit);
      }
   }
}
function del_cur_command() {
   /* Elimina el comando actual a partir de la posición actual del cursor. 
   Devuelve el comando eliminado.
   */
   var $focus=$(":focus");  //Elemento seleccionado.
   if ($focus.length==0) return '';  //No hay selección
   //Información del texto
   var w_txt = $focus.get(0).innerText;
   var cc = read_cur_command($focus);
   //Quita comando
   $focus.get(0).innerText = w_txt.substring(0,cc[1]) + w_txt.substring(cc[2]);
   //Retorna cursor
   set_crs($focus.get(0), cc[1]);
   //Devuelve comando
   return cc[0];  
}
function selected_item($items) {
   /* Recibe en $items la lista de items <li> en un objeto jquery, y devuelve el número
   de elemento que se encuentra seleccionado. El primer elemento se referencia como 0.
   Si no encuentra al elemento seleccionado, devuelve -1.*/
   var n_shown = 0;  //Elementos mostrados
   for (var i=0, l=$items.length; i<l; i++ ) {
      var $this=$($items[i]);
      if ($this.hasClass('act')){  //Está seleccionado
         return n_shown;
      }
      n_shown++;
   }
   //No se encontró.
   return -1;
}
function select_item($items, n) {
   /* Selecciona el ítem indicado en "n" empezando desde 0. 
   Si había algún elemento seleccionado previamente, se le quita la selección.
   */
   var n_shown = 0;  //Elementos mostrados
   for (var i=0, l=$items.length; i<l; i++ ) {
      var $this=$($items[i]);
      if (n_shown == n){  //Se debe seleccionar este.
         $this.addClass('act');  
      } else {  //Quita la selección por si estaba seleccionado.
         $this.removeClass('act');
      }
      n_shown++;
   }
}
function set_start_node(sel_first, sel_menu, onselect) {
   /* Define el bloque en donde se implementará el menú contextual. 
   Parámetros:
      -sel_first -> Selector Jquery del elemento editable en donde se implementará
         el menú contextual.
      -sel_menu  -> Selector jquery de la lista  que se usará para generar el menú 
         contextual.
      -onselect  -> Función evento que se llamará cuando se haga la selección de un 
         ítem del menú contextual. La función recibe un parámetro con el texto del ítem
         seleccionado.
   */
   $firstblk = $(sel_first);  //Primer bloque
   var $men  = $(sel_menu);    //Menú
   var $items = $men.find("li");
   var $items_vis = null;
   $firstblk.keydown(function (event) {
      var itsel=-1;  //Ítem seleccionado.
      //Procesa tecla pulsada
      var w = event.which;
      switch (w) {
         case 37: case 39:  //Direccional izquierda y derecha.
            break;
         case 38:  //Direccional arriba.
            if ($men.is(':visible')) {  //El menú contextual está abierto
               $items_vis = $men.find("li:visible");
               itsel = selected_item($items_vis);
               itsel--;  //Pasa al anterior
               if (itsel<0) itsel=0;
               select_item($items_vis, itsel);
               return false;  //Para que no se procese la tecla
            }
            break;
         case 40:  //Direccional abajo.
            if ($men.is(':visible')) {  //El menú contextual está abierto
               $items_vis = $men.find("li:visible");
               itsel = selected_item($items_vis);
               itsel++;  //Pasa al siguiente
               if (itsel>$items_vis.length-1) itsel=$items_vis.length-1;
               select_item($items_vis, itsel);
               return false;  //No se permitirá agregar saltos de línea en un bloque
            }
            break;
         case 27:  //Escape
            $men.hide();
            break;
         case 46:
            break;
         //default:
         //   console.log(event.which);
      }
   });
   $firstblk.keypress(function (event) {
      //Procesa tecla pulsada. 
      var w = event.which;
         switch (w) {
            case 47:  //Caracter '/'
               break;
            case 13:  //Salto de línea
               if ($men.is(':visible')) {  //El menú contextual está abierto
                  del_cur_command();
                  var $act=$items.filter('.act');  //Elemento activo
                  $men.hide();
                  //alert($act.get(0).innerText);
                  onselect($act.get(0).innerText)    //Llama a evento
               }
               return false;  //No se permitirá agregar saltos de línea en un bloque
               break;
            case 32:  //Espacio
               //$men.hide();
               break;
            //default:  //Cualquier otra tecla
            //   console.log(event.which);
         }
   });
   //Evento "onchamge" para controlar el menú
   $firstblk[0].addEventListener("input", function() {
      //console.log("input event fired");
      update_menu_vis($men);
   }, false);
}
