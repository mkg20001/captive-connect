<?php

function redirect($to) {
  header("Location: $to");
}

redirect("http://captive.localhost:6346/login.php");
