<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">
<HTML>
<HEAD>
  <TITLE>Asociaci&oacute;n Bernardino Rivadavia</TITLE>
  <META http-equiv=Content-Type content="text/html; charset=iso-8859-1">
  <LINK href="estilos/texto.css" rel=stylesheet>
  <LINK href="estilos/estilos.css" rel=stylesheet>
  <base target="_self"> 
  <SCRIPT language="JavaScript1.2" type="text/javascript">
    function tratar_espacios(strInput) {
      var i=0;
      var result="";
      while ( i < strInput.length ) {
        var c = strInput.charAt(i);
        if (c == '+') {
          result += "%20";
        }  else {
          result += c;
        }
        i++;
      }
      return result;
    }

    function modalWin(strEnc) {
      var arg=new Array();
      arg.push(<?php echo $_POST["socioid"]; ?>);
      arg.push(unescape(tratar_espacios(strEnc)));
      //var woptions="";
      var woptions = 'toolbar=0,location=0,directories=0,status=0,menubar=0,' +
                     'resizable=no,scrollbars=0,copyhistory=0,modal=yes,' +
                     'width=600,height=400,left=100,top=50';
      var url='observaciones.php?socio='+arg[0]+'&obs='+strEnc;
      var target='Observaciones';
      var ventana = window.open(url, target, woptions);
      if (ventana.focus)
        ventana.focus();
      var timer = setInterval(function() {
        if(ventana.closed) {
          clearInterval(timer);
          location.reload();
        }
      }, 1000);
    }
  </SCRIPT>
</HEAD>
<BODY bgColor=#ccddcc leftMargin=0 topMargin=0>
<?php


// se carga la configuraci�n del servidor mySQL
include("setup.php");

// Devuelve el nombre del grupo n�mero $grid
function GetGroup($grid)
{
  global $mysqli;

  $res=$GLOBALS['mysqli']->query("SELECT * FROM grupos WHERE `Gr_ID` = '".$grid."'");
  if (!$res) 
    return "(DESCONOCIDO)";
  else {
    $row=$res->fetch_array(MYSQLI_BOTH);
    return $row["Gr_Nombre"];
  }
  
}

$mes=array(1 => "Enero",
        2 => "Febrero",
        3 => "Marzo",
        4 => "Abril",
        5 => "Mayo",
        6 => "Junio",
        7 => "Julio",
        8 => "Agosto",
        9 => "Setiembre",
        10 => "Octubre",
        11 => "Noviembre",
        12 => "Diciembre");

// Devuelve el t�tulo del documento n�mero $grid
function GetTipoDni($grid)
{
  global $mysqli;

  $res=$mysqli->query("SELECT * FROM tipodoc WHERE `TD_ID` = '".$grid."'");
  if (!$res)
    return $grid;
  else {
    $row=$res->fetch_array(MYSQLI_BOTH);
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
  global $mysqli;

	$res=$mysqli->query("SELECT * FROM `grupos` WHERE (`Gr_ID`='$GrID')");
	if (!$res)
		return 0;
	$row=$res->fetch_array(MYSQLI_BOTH);
	$enabled=$row["Gr_Habilitado"];
	return $row["TG_ID"];
}
?>
<?php
  if (!empty($_POST))
  {
?>
<center>
<table cellspacing=2 cellpadding=4 border=1>
<tr>
  <td>
    <table cellspacing=0 cellpadding=0 border=0 style='font-family:verdana; background-color: #c0c0c0'>
<?php
        $res=$mysqli->query("SELECT *, CONCAT(`So_Apellido`, ' ', `So_Nombre`) AS `So_ApeNom` FROM `socios` WHERE (`So_ID` = '".$_POST["socioid"]."')");
        $cont=0;
        $par=0;
        if ((!$res) || (!$res->num_rows)) {
            echo " <tr><td>No se encontr&oacute; ning&uacute;n socio en esta b&uacute;squeda.</td></tr>\n";
        } else {
      	  $row=$res->fetch_array(MYSQLI_BOTH);
          // Consulta por grupo del socio
          $tipo_grupo=GetTipoGrupo($row["Gr_ID"], $hab);

          // Grupo pertenece a socios comunes
          if ($tipo_grupo==1) {
	        // Consulta de estado de cuota
          	$query = "select MAX(`CC_Mes`+(`CC_Anio`*100)) as `CC_Max` from `cobrocuotas` where ((`So_ID`='".$row["So_ID"]."') AND (`CC_Cobrado`='Y') AND (`CC_Anulado`='N')) GROUP BY `So_ID`";
        	//print($query);
          	$res3=$mysqli->query($query); //
            $row3=$res3->fetch_array(MYSQLI_BOTH);
          	$actual=date("n")+date("Y")*100;
            // Si el d�a esta en el rango 1 a 25 => verifica mes anterior pago
            if (date("d")<=25)
            {
            	if (date("n")==1)
                		$actual=$actual-88;
             	else
                		$actual=$actual-1;
            }
          	if ($actual<=$row3["CC_Max"]) {
            		$color_texto_socio="color: #000040; background-color: #80ff80;";
                        $cartel="Al d&iacute;a - Puede Retirar";
                } else {
            		$color_texto_socio="color: #000040; background-color: #80ffff;";
                        $cartel="Tiene deuda - No puede Retirar";
                }
          } else { // Socio de empresa o beneficiario
      		$color_texto_socio="color: #000040; background-color: #ffff80;";
          } ?>
       <tr>
         <td colspan=3>
	 <table width=500 border=0 cellspacing=1 cellpadding=2 style='font-family: verdana'>
	   <tr>
<?php
          // La línea del mes de pago solo se muestra con los socios
          if ($tipo_grupo==1) {
?>
             <th width=150 style='color: #00c000; background-color: #206020' align='left'>&Uacute;ltima Cuota</th>
             <td colspan=3 style='<?php echo $color_texto_socio; ?>; font-weight: bold;' >&nbsp;<?php
                      echo $mes[$row3["CC_Max"]%100];
                      echo "/".floor($row3["CC_Max"]/100); ?><br>&nbsp;<blink style="font-weight: bold;"><?php echo $cartel; ?></blink></td>
          </tr>
          <tr>
<?php
          }  ?>
            <th width=150 style='color: #00c000; background-color: #206020' align='left'>Socio Nro.</th>
            <td style='<?php echo $color_texto_socio; ?>' >&nbsp;<?php echo $row["So_ID"]; ?>&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;Carnet <?php
          if (($row["So_NroCarnet"]==0) || ($row["So_NroCarnet"]==1)) {
              echo "Original";
          } else if ($row["So_NroCarnet"]==2) {
              echo "Duplicado";
          } else if ($row["So_NroCarnet"]==3) {
              echo "Triplicado";
          } else if ($row["So_NroCarnet"]==4) {
              echo "Cuatriplicado";
          } else if ($row["So_NroCarnet"]==5) {
              echo "Quintuplicado";
          } else {
              echo $row["So_NroCarnet"]."ava Copia";
          } ?>
            </td>
  	  </tr>
  	  <tr>
  	    <th style='color: #00c000; background-color: #206020' align='left'>Nombre</th>
	    <td style='<?php echo $color_texto_socio; ?> font-weight: bold' >&nbsp;<?php echo $row["So_ApeNom"]; ?>&nbsp;</td>
  	  </tr>
  	  <tr>
	    <th style='color: #00c000; background-color: #206020'  align='left'>Grupo</th>
  	    <td style='<?php echo $color_texto_socio; ?>' >&nbsp;<?php echo GetGroup($row["Gr_ID"]); ?>&nbsp;</td>
  	  </tr>
  	  <tr>
            <th style='color: #00c000; background-color: #206020'  align='left'>Documento</td>
  	    <td style='<?php echo $color_texto_socio; ?>' >&nbsp;<?php echo GetTipoDni($row["TD_ID"])."&nbsp;".$row["So_NroDoc"]; ?>&nbsp;</td>
  	  </tr>
      	  <tr>
        	<th style='color: #00c000; background-color: #206020'  align='left'>Mes de Ingreso</th>
         	<td style='<?php echo $color_texto_socio; ?>'>&nbsp;<?php echo $mes[$row["So_MesIngre"]].'/'.$row["So_AnioIngre"]; ?></td>
  	  </tr>
      	  <tr>
        	<th style='color: #00c000; background-color: #206020'  align='left'>Observaciones</th>
         	<td id='texto' style='<?php echo $color_texto_socio; ?>'>&nbsp;<?php echo $row["So_Obs"]; ?><button id='boton' onclick="modalWin('<?php echo urlencode($row["So_Obs"])?>');return false;">modificar...</button></td>
      	  </tr>
  	  </table>
	  <br>
	  <table width=500 border=0 cellspacing=1 cellpadding=2 style='font-family: verdana'>
          <tr>
            <th width=150 style='color: #00c000; background-color: #206020'  align='left'>Autorizado</th>
            <td style='<?php echo $color_texto_socio; ?> font-weight: bold' >&nbsp;<?php echo $row["So_Aut_Apellido"]."&nbsp;".$row["So_Aut_Nombre"]; ?>&nbsp;</td>
  	  </tr>
  	  <tr>
  	    <th style='color: #00c000; background-color: #206020'  align='left'>Documento</td>
            <td style='<?php echo $color_texto_socio; ?>' >&nbsp;<?php echo GetTipoDni($row["So_Aut_TipoDoc"])."&nbsp;".$row["So_Aut_NroDoc"]; ?>&nbsp;</td>
          </tr>
          </table>

<?php  // Parte nueva: adicionales
  $res_adic=$mysqli->query("SELECT * FROM `adicionales` WHERE (`So_ID` = '".$_POST["socioid"]."')");
  if ($res_adic) {
    while($row_adic=$res_adic->fetch_array(MYSQLI_BOTH)) {

?>
	  <br>
	  <table width=500 border=0 cellspacing=1 cellpadding=2 style='font-family: verdana'>
          <tr>
            <th width=150 style='color: #00c000; background-color: #206020'  align='left'>Adicional</th>
            <td style='<?php echo $color_texto_socio; ?> font-weight: bold' >&nbsp;<?php echo $row_adic["Ad_ApeNom"]; ?>&nbsp;</td>
  	  </tr>
  	  <tr>
  	    <th style='color: #00c000; background-color: #206020'  align='left'>Documento</td>
            <td style='<?php echo $color_texto_socio; ?>' >&nbsp;<?php echo GetTipoDni($row_adic["TD_ID"])."&nbsp;".$row_adic["Ad_DocNro"]; ?>&nbsp;</td>
          </tr>
          </table>
<?php
    }
  }
?>
	  <br>
	  <table width=500 border=0 cellspacing=1 cellpadding=2 style='font-family: verdana'>
          <tr>
            <th width=150 style='color: #00c000; background-color: #206020'  align='left'>Foto Socio</th>
            <td style='<?php echo $color_texto_socio; ?> font-weight: bold' >
<?php
	  if (!empty($row["So_Foto"]))
  	  { ?>
	            <img src='foto.php?socio=<?php echo $row["So_ID"]; ?>' height=100 align=middle>
<?php
  	  } else { ?>
	            (sin foto)
<?php
  	  } ?>
             </td>
  	      </tr>
          </table>
          <br>
	        <table width=500 border=0 cellspacing=1 cellpadding=2 style='font-family: verdana'>
          <tr>
            <th width=150 style='color: #00c000; background-color: #206020'  align='left'>Préstamos</th>
            <td style='<?php echo $color_texto_socio; ?> font-weight: bold' >
<?php
	  // Ruta al script de bash
    $scriptPath = '/home/app/extract.sh';
    // Construir el comando completo
    $command = "$scriptPath ".$row["So_ID"];
    // Ejecutar el script de bash y capturar la salida
    $output = exec($command);
    if ($output !== null) {
      // Decodificar la salida JSON en una estructura de datos PHP
      $data = json_decode($output, true);
      
      if (json_last_error() === JSON_ERROR_NONE) {
        // Verificar si el JSON decodificado es un arreglo bidimensional
        if (is_array($data) && isset($data[0]) && is_array($data[0])) {
          $headers = $data[0];
          array_shift($data);
          $numElements = count($data);
          echo "Cantidad de libros sacados: $numElements\n";
          // Construir la tabla HTML
          echo "<table border='1'>\n";
          echo "<tr>";
          foreach ($headers as $header) {
              echo "<th>" . htmlspecialchars($header) . "</th>";
          }
          echo "</tr>\n";
          
          // Iterar sobre las filas del arreglo bidimensional
          foreach ($data as $row) {
              echo "<tr>";
              foreach ($row as $cell) {
                  echo "<td>" . htmlspecialchars($cell) . "</td>";
              }
              echo "</tr>\n";
          }
          
          echo "</table>\n";
        } else {
          echo "(no tiene libros en préstamo)";
        }
      } else {
        echo "(no se encontraron libros prestados)";
      }

  	  } else { 
	            echo "(error en la consulta)";
  	  } ?>
             </td>
  	      </tr>
          </table>
      </td>
    </tr>
<?php
        }
  }
?>
    </table>
  </td>
</tr>
</table>
</center>
<FORM name="recargar" method="post" action="">
  <input type='hidden' name='socioid' value='<?php echo $_POST["socioid"]; ?>' />
</FORM>
</body>
</html>
