<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">
<HTML>
<HEAD>
  <TITLE>Asociaci&oacute;n Bernardino Rivadavia</TITLE>

  <META http-equiv=Content-Type content="text/html; charset=iso-8859-1">
  <LINK href="estilos/texto.css" rel=stylesheet>
  <LINK href="estilos/estilos.css" rel=stylesheet>
  <script type="module">
     if (typeof _socio1 !== 'undefined') {
        _socio1.submit();
     }
  </script>
</HEAD>
<BODY bgColor=#cccccc leftMargin=0 topMargin=0>
<?php

// se carga la configuración del servidor mySQL
include('setup.php');

// Devuelve el nombre del grupo número $grid
function GetGroup($grid)
{
  $res=$mysqli->query("SELECT * FROM grupos WHERE `Gr_ID` = '".$grid."'");
  if (!$res)
    return "(DESCONOCIDO)";
  else {
    $row=$res->fetch_array(MYSQLI_ASSOC);
    return $row["Gr_Nombre"];
  }
}

// Devuelve el título del documento número $grid
function GetTipoDni($grid)
{
  $res=$mysqli->query("SELECT * FROM tipodoc WHERE `TD_ID` = '".$grid."'");
  if (!$res)
    return $grid;
  else {
    $row=$res->fetch_array(MYSQLI_ASSOC);
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
	$res=$mysqli->query("SELECT * FROM `grupos` WHERE (`Gr_ID`='$GrID')");
	if (!$res)
		return 0;
	$row=$res->fetch_array(MYSQLI_ASSOC);
	$enabled=$row["Gr_Habilitado"];
	return $row["TG_ID"];
}

function GetRowCount($query) {
  global $mysqli;

  $mysqli->query("SELECT SQL_CALC_FOUND_ROWS $query");
  $res_count=$mysqli->query("SELECT FOUND_ROWS();"); 
  $row_count=$res_count->fetch_array(MYSQLI_BOTH);
  return $row_count[0];
}

function GetFormatClaveSoc()
{
  if (!empty($_POST["raiz"]))
    return "'".TratarEspacios($_POST["buscar_socio"])."%'";
  else
    return "'%".TratarEspacios($_POST["buscar_socio"])."%'";
}

function GetFormatClaveAut()
{
  if (!empty($_POST["raiz"]))
    return "'".TratarEspacios($_POST["buscar_aut"])."%'";
  else
    return "'%".TratarEspacios($_POST["buscar_socio"])."%'";
}


// Arma el query de consulta por socios con nombre "similar" o 
// nro. de socio o carnet "exacto"
function GetQuerySocios() {
  $clave_nombre = GetFormatClaveSoc();
  $clave = "'".TratarEspacios($_POST["buscar_socio"])."'";

  return "*, CONCAT(`So_Apellido`, ' ', `So_Nombre`) as `So_ApeNom`, ".
         "CONCAT(`So_Aut_Apellido`, ' ', `So_Aut_Nombre`) as `So_Aut_ApeNom` FROM `socios` ".
         "WHERE ((CONCAT(`So_Apellido`, ' ', `So_Nombre`) like $clave_nombre) ".
                 "OR (`So_ID` = $clave) ".
                 "OR (`So_NroDoc` = $clave))";
}

// Devuelve el query de consulta de socios con adicionales "like $clave"
// y tambien de autorizados.
function GetQueryAdicYAut()
{
  $clave_nombre=GetFormatClaveAut();
  $clave="'".TratarEspacios($_POST["buscar_aut"])."'";

  return " `socios`.*, ".
         " CONCAT(`socios`.`So_Apellido`, ' ', `socios`.`So_Nombre`) as `So_ApeNom`, ".
         " CONCAT(`socios`.`So_Aut_Apellido`, ' ', `socios`.`So_Aut_Nombre`) as `So_Aut_ApeNom` ".
         "    FROM `socios`, `temp_adicionales` ".
         " WHERE ((CONCAT(`socios`.`So_Aut_Apellido`, ' ', `socios`.`So_Aut_Nombre`) like $clave_nombre) ".
         "        OR (`socios`.`So_Aut_NroDoc` = $clave) ".
         "        OR (`socios`.`So_ID` = `temp_adicionales`.`So_ID`))";
}

// Devuelve el query de consulta de socios con autorizados "like $clave"
function GetQuerySoloAut()
{
  $clave_nombre=GetFormatClaveAut();
  $clave="'".TratarEspacios($_POST["buscar_aut"])."'";

  return " `socios`.*, ".
         " CONCAT(`socios`.`So_Apellido`, ' ', `socios`.`So_Nombre`) as `So_ApeNom`, ".
         " CONCAT(`socios`.`So_Aut_Apellido`, ' ', `socios`.`So_Aut_Nombre`) as `So_Aut_ApeNom` ".
         "    FROM `socios` ".
         " WHERE ((CONCAT(`socios`.`So_Aut_Apellido`, ' ', `socios`.`So_Aut_Nombre`) like $clave_nombre) ".
         "        OR (`socios`.`So_Aut_NroDoc` = $clave))";
}

function BuildTemporaryTable()
{
  global $mysqli;

  $clave_nombre=GetFormatClaveAut();
  $clave="'".TratarEspacios($_POST["buscar_aut"])."'";

  $query2= "`So_ID` FROM `adicionales` WHERE ((`Ad_ApeNom` like $clave_nombre) OR (`Ad_DocNro` = $clave))  GROUP BY `So_ID`";
  $res_temp=$mysqli->query("DROP TEMPORARY TABLE IF EXISTS `temp_adicionales`");
  $res_temp=$mysqli->query("CREATE TEMPORARY TABLE `temp_adicionales` SELECT $query2 ORDER BY `So_ID`");
}

?>

<center>
<table cellspacing=2 cellpadding=4 border=1>
<?php
  if (!empty($_POST))
  {
        if ($_POST["criterio"]=="socio")
        {  // Primer criterio de búsqueda: socios

          $res=$mysqli->query("SELECT ".GetQuerySocios()." ORDER BY CONCAT(`So_Apellido`, ' ', `So_Nombre`)");

        } else if ($_POST["criterio"]=="autorizado") {
           // Segundo criterio de búsqueda: autorizados o adicionales

// Consulta de adicionales: Se arma tabla temporal con los número de los socios titulares
          BuildTemporaryTable();

          if (GetRowCount("* FROM `temp_adicionales`")>0) { // Si hay adicionales con la $clave...

            $query= GetQueryAdicYAut()." GROUP BY `socios`.`So_ID`";
            $res=$mysqli->query("SELECT $query ORDER BY CONCAT(`socios`.`So_Apellido`, ' ', `socios`.`So_Nombre`)");

          } else {  // Sino, solo se buscan los autorizados "like $clave"...

            $query=GetQuerySoloAut();
            $res=$mysqli->query("SELECT $query ORDER BY CONCAT(`socios`.`So_Apellido`, ' ', `socios`.`So_Nombre`)");
          }
        }

        $cont=0;
        $par=0;
        if ((!$res) || (!$res->num_rows)) { ?>
<tr><td align="center" style='font-family: verdana, arial;'>No se encontr&oacute; ning&uacute;n socio en esta b&uacute;squeda.</td></tr>
    <form name='_socio1' method='post' target='_ficha' action="socio.php">
      <input type='hidden' name='socioid' value='-1' />
    </form>
<?php   } else {
          $par=1; $count=1;
      	  while ($row=$res->fetch_array(MYSQLI_BOTH))
      	  {
      	    $par=$par*-1; 
?>
<tr>
  <td align="left" style='font-family: verdana, arial; background-color: <?php
      	    if ($par==-1) { echo "#808080"; } else { echo "#404040"; } ?>; cursor: pointer; cursor: hand; color: #ffffff;' 
      	    onclick='Javascript:_socio<?php echo $count ?>.submit();'>
<?php
      ?>
    <form name='_socio<?php echo $count ?>' method='post' target='_ficha' action="socio.php">
      <input type='hidden' name='socioid' value='<?php echo $row["So_ID"]; ?>' />
    </form>
<?php       echo $row["So_Apellido"]." ".$row["So_Nombre"]; ?>
  </td>
</tr>
<?php     $count++; 
          }
        }
  }
?>
</table>
</center>
</body>
</html>
