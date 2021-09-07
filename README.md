# jcontext_menu
Javascript code to implement a context menu in a HTML editable element.

![sample page](https://github.com/t-edson/jcontext_menu/blob/main/screen1.png?raw=true)

Sample code:

```
<BODY>
   <div class="ctxmenu">
      <ul>
         <li>option 1</li>
         <li>option 2</li>
         <li>option 3</li>
      </ul>
   </div>
   <p id="first" class="block text" contenteditable="true" ></p>

   <script src="https://code.jquery.com/jquery-1.12.0.min.js"></script>
   <script src="jcontext_menu.js"></script>
   <script>
      //Set context menu to editable.
      set_context_menu('#first', '.ctxmenu', function(item_sel) {
         alert(item_sel);
      });
   </script>
</BODY>
```
Jquery is need to be included.

The context menu is opened when key "/" is pressed.

The context menu is created from a &lt;ul&gt; list element.
