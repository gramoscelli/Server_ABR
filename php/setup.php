<?php
if (!defined("SETUP_PHP")) // previene que se produzcan varias llamadas (o varios require('setup.php'))
{
  define("SETUP_PHP", 1);
  $address_db="mysql";
  $user_db="abr";
  $pass_db="abr2005";
  $db_name="abr";
  $mysqli = new mysqli($address_db, $user_db, $pass_db, $db_name);
  $mysqli->set_charset("utf8");
}

?>
