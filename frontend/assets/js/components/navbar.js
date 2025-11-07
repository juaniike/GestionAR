const currentUser = JSON.parse(sessionStorage.getItem("user"));

const usernameElement = document.getElementById("navbar-username");

if (currentUser && usernameElement) {
  usernameElement.textContent = currentUser.username;
}
