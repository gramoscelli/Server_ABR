<?php

  function cambiar_comillas($strEnc) {
    $i=0;
    $result="";
    while ($i<strlen($strEnc)) {
      if ($strEnc[$i]!="'")
        $result=$result.$strEnc[$i];
      else
        $result=$result."\\'";
      $i++;
    }
    return $result;
  }
?><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">
<HTML>
<HEAD>
  <TITLE>Asociaci&oacute;n Bernardino Rivadavia</TITLE>

  <META http-equiv=Content-Type content="text/html; charset=iso-8859-1">
  <LINK href="estilos/texto.css" rel=stylesheet>
  <LINK href="estilos/estilos.css" rel=stylesheet>
  <base target="_self">
  <script
    src="https://code.jquery.com/jquery-3.7.1.min.js"
    integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="
    crossorigin="anonymous">
  </script>
  <script>
    function callPhp(url, parameters) {
            // function below will run clear.php?h=michael
              $.ajax({
                  type: "GET",
                  url: url ,
                  data: parameters
                })
                  //.done( () => { window.close(); } )
                  .done( (data) => { (data === "OK")? window.close() : alert("Error al guardar los cambios") } )
                  .fail( () => { alert("Error al intentar guardar los cambios"); } );
    }

    function save_obs() {
      var parameters = {  obs: obs.value, socio: socio.value }
      callPhp("save.php", parameters);
    }

    function clear_obs() {
      var parameters = {  obs: "", socio: socio.value }
      callPhp("save.php", parameters);
    }
  </script>
</HEAD>
<BODY bgColor=#ccddcc leftMargin=0 topMargin=0 onLoad="Cargar();"">
<center>
<table cellspacing=2 cellpadding=4 border=1>
<tr>
  <td>
    <table cellspacing=0 cellpadding=0 border=0 style='font-family:verdana; background-color: #c0c0c0'>
       <tr>
         <td colspan=3>
	 <table width=500 border=0 cellspacing=1 cellpadding=2 style='font-family: verdana'>
	   <tr>
             <th style='color: #00c000; background-color: #206020'>Modificar las Observaciones del socio <input type='text' name='socio' id='socio' readonly /></th>
          </tr>
	  <table width=500 border=0 cellspacing=1 cellpadding=2 style='font-family: verdana'>
          <tr>
            <td style='color: #000040; background-color: #80ff80; font-weight: bold' ><TEXTAREA name="obs" id="obs" rows="6" cols="70"><?php echo $_GET["obs"]; ?></TEXTAREA></td>
          </tr>
            <td style='color: #000040; background-color: #80ff80; font-weight: bold' ><BUTTON onclick="save_obs()">Guardar</BUTTON><BUTTON onclick="clear_obs()">Borrar</BUTTON><BUTTON onclick="window.close()">Cerrar</BUTTON></td>
  	  </tr>
          </table>
      </td>
    </tr>
    </table>
  </td>
</tr>
</table>
  <SCRIPT language="JavaScript1.2" type="text/javascript">
    function Cargar() {
      socio.value="<?php echo $_GET["socio"] ?>";
      obs.value="<?php echo str_replace("\n","\\n",str_replace("\r","", $_GET["obs"])) ?>";
    }
  </SCRIPT>
</BODY>
</HTML>
