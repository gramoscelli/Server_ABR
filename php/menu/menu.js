/*
 DHTML Menu version 3.3.19
 Written by Andy Woolley
 Copyright 2002 (c) Milonic Solutions. All Rights Reserved.
 Plase vist http://www.milonic.co.uk/menu or e-mail menu3@milonic.com
 You may use this menu on your web site free of charge as long as you place prominent links to http://www.milonic.co.uk/menu and
 your inform us of your intentions with your URL AND ALL copyright notices remain in place in all files including your home page
 Comercial support contracts are available on request if you cannot comply with the above rules.
 This script featured on Dynamic Drive (http://www.dynamicdrive.com)
 */

//The following line is critical for menu operation, and MUST APPEAR ONLY ONCE. If you have more than one menu_array.js file rem out this line in subsequent files

menunum=0;
menus=new Array();
_d=document;
function addmenu(){menunum++;menus[menunum]=menu;}

function dumpmenus(){mt="<script language=javascript>";
			for(a=1;a<menus.length;a++)
			{mt+=" menu"+a+"=menus["+a+"];"}
			mt+="<\/script>";
			_d.write(mt)}


//Please leave the above line intact. The above also needs to be enabled if it not already enabled unless this file is part of a multi pack.



////////////////////////////////////
// Editable properties START here //
////////////////////////////////////

// Special effect string for IE5.5 or above please visit http://www.milonic.co.uk/menu/filters_sample.php for more filters
if(navigator.appVersion.indexOf("MSIE 6.0")>0)
{
	effect = "Fade(duration=0.2);Alpha(style=0,opacity=100);Shadow(color='#777777', Direction=135, Strength=5)"
}
else
{
	effect = "Shadow(color='#777777', Direction=135, Strength=5)" // Stop IE5.5 bug when using more than one filter
}


// "ccccff",			// Color de fondo del menú sin activar "ccccff"

timegap=500			// The time delay for menus to remain visible
followspeed=5			// Follow Scrolling speed
followrate=40			// Follow Scrolling Rate
suboffset_top=10;		// Sub menu offset Top position 
suboffset_left=10;		// Sub menu offset Left position
style1=[			// style1 is an array of properties. You can have as many property arrays as you need. This means that menus can have their own style.
"#5A4A0B",				// Mouse Off Font Color "navy"
"#F7DC9A", //"#CECFFF",		// Color de fondo del menú sin activar "ccccff"
"ffebdc",			// Mouse On Font Color "ffebdc"
"#8F6F00",			// Color de fondo del menú cuando se activa "4b0082"
"000000",			// Color de los bordes del menú "000000" 
9,				// Font Size in pixels
"normal",			// Font Style (italic or normal)
"bold",				// Font Weight (bold or normal)
"Verdana, Arial",		// Font Name
4,				// Menu Item Padding
"imagenes/icono_menu_flecha_adelante.gif",	  		// Sub Menu Image (Leave this blank if not needed)
,				// 3D Border & Separator bar
"66ffff",			// 3D High Color
"4F380F",			// 3D Low Color 
"#ffffff",			// Color del menú que activa la página que estas viendo (leave this blank to disable)"Purple"
"#4E3D03",				// Color del texto del menú que activa la página que estas viendoCurrent(leave this blank to disable)"pink"
,				// Top Bar image (Leave this blank to disable)
"ffffff",			// Menu Header Font Color (Leave blank if headers are not needed)
"7CD740",			// Menu Header Background Color (Leave blank if headers are not needed)
]



addmenu(menu=[		// This is the array that contains your menu properties and details
"mainmenu",			// Menu Name - This is needed in order for the menu to be called
5,				// Menu Top - The Top position of the menu in pixels
200,				// Menu Left - The Left position of the menu in pixels
,				// Menu Width - Menus width in pixels
1,				// Menu Border Width 
"center",			// Screen Position - here you can use "center;left;right;middle;top;bottom" or a combination of "center:middle"
style1,				// Properties Array - this is set higher up, as above
1,				// Always Visible - allows the menu item to be visible at all time (1=on/0=off)
"left",				// Alignment - sets the menu elements text alignment, values valid here are: left, right or center
effect,				// Filter - Text variable for setting transitional effects on menu activation - see above for more info
0,				// Follow Scrolling - Tells the menu item to follow the user down the screen (visible at all times) (1=on/0=off)
1, 				// Horizontal Menu - Tells the menu to become horizontal instead of top to bottom style (1=on/0=off)
,				// Keep Alive - Keeps the menu visible until the user moves over another menu or clicks elsewhere on the page (1=on/0=off)
,				// Position of TOP sub image left:center:right
,				// Set the Overall Width of Horizontal Menu to 100% and height to the specified amount (Leave blank to disable)
,				// Right To Left - Used in Hebrew for example. (1=on/0=off)
,				// Open the Menus OnClick - leave blank for OnMouseover (1=on/0=off)
,				// ID of the div you want to hide on MouseOver (useful for hiding form elements)
,				// Reserved for future use
,				// Reserved for future use
,				// Reserved for future use

,"&nbsp;&nbsp;&nbsp;&nbsp;Inicio&nbsp;&nbsp;&nbsp;&nbsp;","show-menu=Home","index.html","",1
,"&nbsp;Información de un Socio&nbsp;","show-menu=Socios","socios.php","",1 
,"&nbsp;Consultas SQL&nbsp;","show-menu=Servicios","phpmyadmin","",1 
])


	addmenu(menu=["Inicio",,,,0,"",style1,,"",effect,,,,,,,,,,,,
	])	

	addmenu(menu=["Socios",,,,0,"",style1,,"",effect,,,,,,,,,,,,
	])	

	addmenu(menu=["Servicios",,,,0,"",style1,,"",effect,,,,,,,,,,,,
	])	


dumpmenus()