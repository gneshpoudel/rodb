// ===== NEW EDITOR IMPLEMENTATION - EVENT LISTENERS (NO INLINE ONCLICK) =====
function initializeEditor() {
    const editor = document.getElementById('body');
    const toolbar = document.getElementById('editorToolbar');
    const colorPicker = document.getElementById('textColor');
    const previewBtn = document.getElementById('previewBtn');
    const resetBtn = document.getElementById('resetBtn');

    if (!editor || !toolbar) {
        console.error('Editor elements not found');
        return;
    }

    console.log('Initializing editor...');

    // Attach click handlers to all toolbar buttons
    toolbar.querySelectorAll('.editor-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const command = this.dataset.command;
            const value = this.dataset.value || null;

            console.log('Editor button clicked:', command, value);

            editor.focus();

            if (command === 'createLink') {
                const url = prompt('Enter URL:', 'https://');
                if (url && url.trim()) {
                    document.execCommand('createLink', false, url);
                }
            } else if (command === 'insertImage') {
                const url = prompt('Enter Image URL:', 'https://');
                if (url && url.trim()) {
                    document.execCommand('insertImage', false, url);
                }
            } else {
                document.execCommand(command, false, value);
            }

            editor.focus();
        });
    });

    // Color picker
    if (colorPicker) {
        colorPicker.addEventListener('change', function () {
            editor.focus();
            document.execCommand('foreColor', false, this.value);
            editor.focus();
        });
    }

    // Preview button
    if (previewBtn) {
        previewBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const headline = document.getElementById('headline').value;
            const body = editor.innerHTML;
            const summary = document.getElementById('summary').value;

            if (!headline || !body || body === '<p>Start writing your article here...</p>') {
                alert('Please add a headline and body content before previewing');
                return;
            }

            const previewWindow = window.open('', 'ArticlePreview', 'width=900,height=700,scrollbars=yes');

            if (!previewWindow) {
                alert('Preview blocked. Please allow popups for this site.');
                return;
            }

            previewWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Preview</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 800px; margin: 30px auto; padding: 30px; background: #f5f5f5; }
                        .preview { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .badge { background: #ff9800; color: white; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-bottom: 20px; }
                        h1 { color: #D32F2F; margin: 0 0 20px 0; }
                        .summary { font-style: italic; color: #666; padding: 20px; background: #f9f9f9; border-left: 4px solid #D32F2F; margin: 20px 0; }
                        .body { line-height: 1.8; color: #333; }
                        .body img { max-width: 100%; height: auto; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="preview">
                        <div class="badge">PREVIEW</div>
                        <h1>${headline}</h1>
                        ${summary ? `<div class="summary">${summary}</div>` : ''}
                        <div class="body">${body}</div>
                    </div>
                </body>
                </html>
            `);
            previewWindow.document.close();
        });
    }

    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm('Reset form? All unsaved changes will be lost.')) {
                document.getElementById('createArticleForm').reset();
                editor.innerHTML = '<p>Start writing your article here...</p>';
                editingArticleId = null;
            }
        });
    }

    console.log('Editor initialized successfully!');
}

// Call initializeEditor when showing the create article section
const originalShowSection = showSection;
showSection = function (sectionName) {
    originalShowSection(sectionName);
    if (sectionName === 'create-article') {
        setTimeout(initializeEditor, 100);
    }
};
