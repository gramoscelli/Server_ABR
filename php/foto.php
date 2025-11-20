<?php


  // Debe haber un comando GET

  if (empty($_GET)) exit;

  include('setup.php');
  $query = "SELECT So_Foto FROM socios
              WHERE So_ID = ".$_GET["socio"];

  if (!($result = $mysqli->query($query)))
     exit;

  $data = $result->fetch_array(MYSQLI_ASSOC);

  if (!empty($data["So_Foto"]))
  {
    // Output the MIME header
    // header("Content-Type: image/jpeg");
    // Output the image
    echo $data["So_Foto"];
   }
?>
