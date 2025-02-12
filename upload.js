(function( $ ){
    // 当domReady的时候开始初始化
    $(function() {
        $('#fileInput').change(function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            
            reader.onload = function(e) {
                // 显示预览
                $('#previewImage').css({
                    'background-image': 'url(' + e.target.result + ')',
                    'display': 'block'
                });
                
                // 显示Base64编码
                $('#base64Output').val(e.target.result);
            };

            // 读取为DataURL
            reader.readAsDataURL(file);
        });
    });

})( jQuery );