(function( $ ){
    // 当domReady的时候开始初始化
    $(function() {
        $('#fileInput').change(function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            
            reader.onload = function(e) {
                const base64 = e.target.result;
                // 显示预览
                $('#previewImage').css({
                    'background-image': `url(${base64})`,
                    'display': 'block'
                });
                // 显示Base64（带前缀）
                $('#base64Output').val(base64);
            };

            reader.readAsDataURL(file);
        });
    });

})( jQuery );