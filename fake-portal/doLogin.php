<?php

function redirect($to) {
  header("Location: $to");
}

if (!isset($_POST["username"]) || !isset($_POST["password"]) || !isset($_POST["tosAck"])) {
  redirect("/login.php?fail");
  die("");
}

if ($_POST["username"] == "theoneandonly" && $_POST["password"] == "useraccount") { // best login ever, i know
  redirect("/success.php");
} else {
  redirect("/login.php?fail");
}
