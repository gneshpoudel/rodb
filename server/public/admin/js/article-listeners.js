// ===== EVENT DELEGATION FOR ARTICLE BUTTONS =====
// This function attaches event listeners to article action buttons
window.attachArticleListeners = function (container) {
    if (!container) return;

    // Edit buttons
    container.querySelectorAll('.article-edit-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const articleId = parseInt(this.dataset.articleId);
            console.log('Edit clicked for article:', articleId);
            if (window.editArticle) {
                window.editArticle(articleId);
            }
        });
    });

    // Delete buttons
    container.querySelectorAll('.article-delete-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const articleId = parseInt(this.dataset.articleId);
            console.log('Delete clicked for article:', articleId);
            if (window.deleteArticle) {
                window.deleteArticle(articleId);
            }
        });
    });

    // Approve buttons
    container.querySelectorAll('.article-approve-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const articleId = parseInt(this.dataset.articleId);
            console.log('Approve clicked for article:', articleId);
            if (window.approveArticle) {
                window.approveArticle(articleId);
            }
        });
    });

    console.log('Article listeners attached');
};
