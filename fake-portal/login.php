<!doctype html>

<html>

<head>
  <title>CaptiveWorld Captive Portal</title>
</head>

<body>
  <center>
    <h2>CaptiveLogin</h2>
    <div id="fail" style="display: none; background: red; color: white">
      <h2>Authentication failure</h2>
    </div>
    <form action="/doLogin.php" method="POST">
      <input name="username" placeholder="Username" type="text"><br><br>
      <input name="password" placeholder="Password" type="password"><br><br>
      <div style="background: #afafaf"><input name="tosAck" value="Accept TOS" type="checkbox">Accept TOS</div><br><br>
      <input type="submit" value="Login">
    </form>
  </center>
  <script>
  if (window.location.href.endsWith('fail')) {
    document.getElementById('fail').style.display = 'block'
  }
  </script>
</body>

</html>
