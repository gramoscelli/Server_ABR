<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">
<HTML>
<HEAD>
  <TITLE>Asociaci&oacute;n Bernardino Rivadavia</TITLE>

  <META http-equiv=Content-Type content="text/html; charset=iso-8859-1">
  <LINK href="estilos/texto.css" rel=stylesheet>
  <LINK href="estilos/estilos.css" rel=stylesheet>
</HEAD>
<BODY bgColor=#ded3ad leftMargin=0 topMargin=0>
<center>
  <font style="font-family: verdana; color: #73481e; font-size: 12pt; font-weight: bold">Asociaci&oacute;n Bernardino Rivadavia</font>
</center>
<?php

// se carga la configuración del servidor mySQL
include('setup.php');

// Devuelve el nombre del grupo número $grid
function GetGroup($grid)
{
  $res=mysql_query("SELECT * FROM grupos WHERE `Gr_ID` = '".$grid."'");
  if (!$res) 
    return "(DESCONOCIDO)";
  else {
    $row=mysql_fetch_array($res);
    return $row["Gr_Nombre"];
  }
}

// Devuelve el título del documento número $grid
function GetTipoDni($grid)
{
  $res=mysql_query("SELECT * FROM tipodoc WHERE `TD_ID` = '".$grid."'");
  if (!$res) 
    return $grid;
  else {
    $row=mysql_fetch_array($res);
    return $row["TD_Tipo"];
  }
}

function TratarEspacios($clave_literal)
{
  $clave_literal=chop($clave_literal);
  $res="";
  for ($i=0; $i<strlen($clave_literal); $i++)
  {
    if ($clave_literal[$i]!=" ")
      $res=$res.$clave_literal[$i];
    else
      $res=$res."_";
  }
  return $res;
}

function GetTipoGrupo($GrID, &$enabled)
{
	$res=mysql_query("SELECT * FROM `grupos` WHERE (`Gr_ID`='$GrID')");
	if (!$res)
		return 0;
	$row=mysql_fetch_array($res);
	$enabled=$row["Gr_Habilitado"];
	return $row["TG_ID"];
	
}
?>
<center>
<table style="font-family: verdana; background-color=#f7dc9a; " 
  cellSpacing=0 border=1 cellPadding=2 borderColorDark=#836900 borderColorLight=#ae9c54>
<tr>
  <td><table>
    <form method="post" target="_lista" action="lista.php">
    <tr>
      <td width="290" style="font-size: 10pt">Nombre, N&uacute;mero o Documento del Socio:&nbsp;&nbsp;</td>
      <td><input type="text" id="_buscar" value="" name="buscar_socio"/></td>
      <td><BUTTON style="BORDER-RIGHT: 0px; BORDER-TOP: 0px; BORDER-LEFT: 0px; WIDTH: 55px; CURSOR: hand; BORDER-BOTTOM: 0px; HEIGHT: 25px" 
            name="enviar" type=submit>
          <IMG height=25 src="buscar.gif" width=55>
          </BUTTON></td>
    </tr><tr>
      <td style="font-size: 8pt">
          <INPUT type=checkbox checked value=yes name=raiz> B&uacute;squeda de la expresi&oacute;n por ra&iacute;z
      </td>
    </tr>
    <input type="hidden" name="buscar_aut" value="1" />
    <input type="hidden" name="criterio" value="socio" />
    </form>
    </table></td>
  <td><table>
    <form method="post" target="_lista" action="lista.php">
    <tr>
      <td width="290" style="font-size: 10pt">Nombre o Documento del Autorizado o Adicional:&nbsp;&nbsp;<input type="hidden" name="posicion" value="0" /></td>
      <td><input type="text" id="_buscar" value="" name="buscar_aut"/></td>
      <td><BUTTON style="BORDER-RIGHT: 0px; BORDER-TOP: 0px; BORDER-LEFT: 0px; WIDTH: 55px; CURSOR: hand; BORDER-BOTTOM: 0px; HEIGHT: 25px" 
            name="enviar" type=submit>
          <IMG height=25 src="buscar.gif" width=55>
          </BUTTON></td>
    </tr><tr>
      <td style="font-size: 8pt">
          <INPUT type=checkbox checked value=yes name=raiz> B&uacute;squeda de la expresi&oacute;n por ra&iacute;z
      </td>
    </tr>
    <input type="hidden" name="buscar_socio" value="1" />
    <input type="hidden" name="criterio" value="autorizado" />
    </form>
    </table></td>
</tr>
</table>
</center>
</body>
</html>
