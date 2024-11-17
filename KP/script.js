function showPage(pageId) {
  var pages = document.querySelectorAll(".page");
  pages.forEach(function (page) {
    page.style.display = "none";
  });
  document.getElementById(pageId).style.display = "block";
}