(function( $ ){
    // 当domReady的时候开始初始化
    $(function() {
        // 初始化加载状态
        const $container = $('#container');
        const $spinner = $('<div class="loading-spinner"></div>').appendTo($container);

        $('#fileInput').change(function(e) {
            const file = e.target.files[0];
            if (!file) return;

            // 显示加载状态
            $spinner.show();
            
            const reader = new FileReader();
            
            reader.onloadstart = function() {
                $container.addClass('uploading');
            };

            reader.onload = function(e) {
                const base64 = e.target.result;
                $('#previewImage')
                    .css('background-image', `url(${base64})`)
                    .fadeIn(300);
                $('#base64Output').val(base64);
            };

            reader.onloadend = function() {
                $spinner.hide();
                $container.removeClass('uploading');
            };

            reader.onerror = function() {
                alert('图片读取失败，请重试');
                $spinner.hide();
                $container.removeClass('uploading');
            };

            reader.readAsDataURL(file);
        });
    });

})( jQuery );