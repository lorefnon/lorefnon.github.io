window.Blog = window.Blog || {}

const escapeHtml = (unsafe) => unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");

window.Blog.loadComments = async (host, id) => {
    const commentsTarget = document.querySelector('.comments-target')
    if (!commentsTarget) return;
    commentsTarget.classList.add('populated')
    commentsTarget.innerHTML = "Loading";
    try {
        const resp = await fetch(`https://${host}/api/v1/statuses/${id}/context`)
        const data = await resp.json()
        if(data['descendants'] && Array.isArray(data['descendants']) && data['descendants'].length > 0) {
            commentsTarget.innerHTML = "";
            data['descendants'].forEach((reply) => {
            reply.account.display_name = escapeHtml(reply.account.display_name);
            reply.account.emojis.forEach(emoji => {
              reply.account.display_name = reply.account.display_name.replace(`:${emoji.shortcode}:`,
                `<img src="${escapeHtml(emoji.static_url)}" alt="Emoji ${emoji.shortcode}" height="20" width="20" />`);
            });
            mastodonComment =
              `<div class="mastodon-comment">
                 <div class="avatar">
                   <img src="${escapeHtml(reply.account.avatar_static)}" height=60 width=60 alt="">
                 </div>
                 <div class="content">
                   <div class="author">
                     <a href="${reply.account.url}" rel="nofollow">
                       <span>${reply.account.display_name}</span>
                       <span class="disabled">${escapeHtml(reply.account.acct)}</span>
                     </a>
                     <a class="date" href="${reply.uri}" rel="nofollow">
                       ${reply.created_at.substr(0, 10)}
                     </a>
                   </div>
                   <div class="mastodon-comment-content">${reply.content}</div>
                 </div>
               </div>`;
            commentsTarget.appendChild(DOMPurify.sanitize(mastodonComment, {'RETURN_DOM_FRAGMENT': true}));
            });
        } else {
            commentsTarget.innerHTML = "<p>Not comments found</p>";
        }
    } catch (e) {
        console.error(e)
        commentsTarget.innerHTML = "Sorry! Failed to load comments."
    }

}
