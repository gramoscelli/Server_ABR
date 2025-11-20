<?php


  // Debe haber un comando GET

  if (empty($_GET)) exit;

  include('setup.php');
  $query = "UPDATE socios SET So_Obs = ('".$_GET["obs"]."') WHERE So_ID = ".$_GET["socio"];

  if (!($result = $mysqli->query($query))) {
     print("ERROR");
     exit;
  }
  print("OK");

?>
