document.addEventListener("click", (e) => {
  let handle;
  if (e.target.classList.contains("hlcode-fold-handle")) {
    hadle = e.target;
  } else if (e.target.classList.contains("hlcode-fold-text")) {
    handle = e.target.parentElement;
  }
  if (!handle) return;
  const { foldId } = handle.dataset;
  if (!foldId) return;
  handle.remove();
  const foldedLines = document.querySelectorAll(
    `.hlcode-line-fold[data-fold-id="${foldId}"]`
  );
  for (let i = 0; i < foldedLines.length; i++) {
    foldedLines[i].classList.remove("hidden");
  }
});
