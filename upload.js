(function( $ ){
    // 当domReady的时候开始初始化
    $(function() {
        var $wrap = $('#uploader'),

            // 图片容器
            $queue = $( '<ul class="filelist"></ul>' )
                .appendTo( $wrap.find( '.queueList' ) ),

            // 状态栏，包括进度和控制按钮
            $statusBar = $wrap.find( '.statusBar' ),

            // 文件总体选择信息。
            $info = $statusBar.find( '.info' ),

            // 上传按钮
            $upload = $wrap.find( '.uploadBtn' ),

            // 没选择文件之前的内容。
            $placeHolder = $wrap.find( '.placeholder' ),

            $progress = $statusBar.find( '.progress' ).hide(),

            // 添加的文件数量
            fileCount = 0,

            // 添加的文件总大小
            fileSize = 0,

            // 优化retina, 在retina下这个值是2
            ratio = window.devicePixelRatio || 1,

            // 缩略图大小
            thumbnailWidth = 110 * ratio,
            thumbnailHeight = 110 * ratio,

            // 可能有pedding, ready, uploading, confirm, done.
            state = 'pedding',

            // 所有文件的进度信息，key为file id
            percentages = {},
            // 判断浏览器是否支持图片的base64
            isSupportBase64 = ( function() {
                var data = new Image();
                var support = true;
                data.onload = data.onerror = function() {
                    if( this.width != 1 || this.height != 1 ) {
                        support = false;
                    }
                }
                data.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
                return support;
            } )(),

            // 检测是否已经安装flash，检测flash的版本
            flashVersion = ( function() {
                var version;

                try {
                    version = navigator.plugins[ 'Shockwave Flash' ];
                    version = version.description;
                } catch ( ex ) {
                    try {
                        version = new ActiveXObject('ShockwaveFlash.ShockwaveFlash')
                                .GetVariable('$version');
                    } catch ( ex2 ) {
                        version = '0.0';
                    }
                }
                version = version.match( /\d+/g );
                return parseFloat( version[ 0 ] + '.' + version[ 1 ], 10 );
            } )(),

            supportTransition = (function(){
                var s = document.createElement('p').style,
                    r = 'transition' in s ||
                            'WebkitTransition' in s ||
                            'MozTransition' in s ||
                            'msTransition' in s ||
                            'OTransition' in s;
                s = null;
                return r;
            })(),

            // WebUploader实例
            uploader;

        if ( !WebUploader.Uploader.support('flash') && WebUploader.browser.ie ) {

            // flash 安装了但是版本过低。
            if (flashVersion) {
                (function(container) {
                    window['expressinstallcallback'] = function( state ) {
                        switch(state) {
                            case 'Download.Cancelled':
                                alert('您取消了更新！')
                                break;

                            case 'Download.Failed':
                                alert('安装失败')
                                break;

                            default:
                                alert('安装已成功，请刷新！');
                                break;
                        }
                        delete window['expressinstallcallback'];
                    };

                    var swf = './expressInstall.swf';
                    // insert flash object
                    var html = '<object type="application/' +
                            'x-shockwave-flash" data="' +  swf + '" ';

                    if (WebUploader.browser.ie) {
                        html += 'classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" ';
                    }

                    html += 'width="100%" height="100%" style="outline:0">'  +
                        '<param name="movie" value="' + swf + '" />' +
                        '<param name="wmode" value="transparent" />' +
                        '<param name="allowscriptaccess" value="always" />' +
                    '</object>';

                    container.html(html);

                })($wrap);

            // 压根就没有安转。
            } else {
                $wrap.html('<a href="http://www.adobe.com/go/getflashplayer" target="_blank" border="0"><img alt="get flash player" src="http://www.adobe.com/macromedia/style_guide/images/160x41_Get_Flash_Player.jpg" /></a>');
            }

            return;
        } else if (!WebUploader.Uploader.support()) {
            alert( 'Web Uploader 不支持您的浏览器！');
            return;
        }

        // 实例化
        uploader = WebUploader.create({
            pick: {
                id: '#filePicker',
                label: '点击选择图片'
            },
            formData: {
                uid: 123
            },
            dnd: false,
            paste: false,
            swf: '',
            chunked: false,
            chunkSize: 512 * 1024,
            server: '../../server/fileupload.php',
            runtimeOrder: 'html5',
            disableGlobalDnd: true,
            fileNumLimit: 1,
            fileSizeLimit: 200 * 1024 * 1024,
            fileSingleSizeLimit: 50 * 1024 * 1024
        });

        uploader.on('ready', function() {
            window.uploader = uploader;
        });

        // 当有文件添加进来时执行，负责view的创建
        function addFile(file) {
            var $preview = $('#singlePreview');
            var $dndArea = $('#dndArea');
            
            // 添加has-image类
            $dndArea.addClass('has-image');
            
            // 清空之前的内容并显示
            $preview.empty().show();
            
            // 生成缩略图
            uploader.makeThumb(file, function(error, src) {
                if (!error) {
                    $preview.css('background-image', 'url(' + src + ')');
                }
            }, thumbnailWidth, thumbnailHeight);

            // 移除旧的文件
            if (uploader.getFiles().length > 1) {
                uploader.removeFile(uploader.getFiles()[0]);
            }
        }

        // 负责view的销毁
        function removeFile(file) {
            $('#singlePreview').hide().css('background-image', 'none');
            updateTotalProgress();
        }

        function updateTotalProgress() {
            var loaded = 0,
                total = 0,
                spans = $progress.children(),
                percent;

            $.each( percentages, function( k, v ) {
                total += v[ 0 ];
                loaded += v[ 0 ] * v[ 1 ];
            } );

            percent = total ? loaded / total : 0;


            spans.eq( 0 ).text( Math.round( percent * 100 ) + '%' );
            spans.eq( 1 ).css( 'width', Math.round( percent * 100 ) + '%' );
            updateStatus();
        }

        function updateStatus() {
            var text = '', stats;

            if ( state === 'ready' ) {
                text = '选中' + fileCount + '张图片，共' +
                        WebUploader.formatSize( fileSize ) + '。';
            } else if ( state === 'confirm' ) {
                stats = uploader.getStats();
                if ( stats.uploadFailNum ) {
                    text = '已成功上传' + stats.successNum+ '张照片至XX相册，'+
                        stats.uploadFailNum + '张照片上传失败，<a class="retry" href="#">重新上传</a>失败图片或<a class="ignore" href="#">忽略</a>'
                }

            } else {
                stats = uploader.getStats();
                text = '共' + fileCount + '张（' +
                        WebUploader.formatSize( fileSize )  +
                        '），已上传' + stats.successNum + '张';

                if ( stats.uploadFailNum ) {
                    text += '，失败' + stats.uploadFailNum + '张';
                }
            }

            $info.html( text );
        }

        function setState(val) {
            // 删除原有复杂的状态切换逻辑
        }

        uploader.onUploadProgress = function( file, percentage ) {
            var $li = $('#'+file.id),
                $percent = $li.find('.progress span');

            $percent.css( 'width', percentage * 100 + '%' );
            percentages[ file.id ][ 1 ] = percentage;
            updateTotalProgress();
        };

        uploader.onFileQueued = function(file) {
            $('.uploadBtn').removeClass('disabled');
            // 隐藏选择按钮
            $('#filePicker').hide();
            
            // 生成预览图
            uploader.makeThumb(file, function(error, src) {
                if (!error) {
                    $('#photo').css({
                        'background-image': 'url(' + src + ')',
                        'display': 'block'
                    });
                }
            }, 320, 320); // 固定预览尺寸
        };

        uploader.onFileDequeued = function(file) {
            $('#photo').css('background-image', 'none').hide();
            $('#filePicker').show(); // 重新显示选择按钮
        };

        uploader.on( 'all', function( type ) {
            var stats;
            switch( type ) {
                case 'uploadFinished':
                    setState( 'confirm' );
                    break;

                case 'startUpload':
                    setState( 'uploading' );
                    break;

                case 'stopUpload':
                    setState( 'paused' );
                    break;

            }
        });

        uploader.onError = function( code ) {
            alert( 'Eroor: ' + code );
        };

        $upload.on('click', function() {
            if ( $(this).hasClass( 'disabled' ) ) {
                return false;
            }

            if ( state === 'ready' ) {
                uploader.upload();
            } else if ( state === 'paused' ) {
                uploader.upload();
            } else if ( state === 'uploading' ) {
                uploader.stop();
            }
        });

        $info.on( 'click', '.retry', function() {
            uploader.retry();
        } );

        $info.on( 'click', '.ignore', function() {
            alert( 'todo' );
        } );

        $upload.addClass( 'state-' + state );
        updateTotalProgress();

        // 初始化时隐藏预览框
        $('#singlePreview').hide();

        // 修改上传按钮点击事件
        $upload.click(function() {
            if (uploader.getFiles().length) {
                if (!uploader.isUploading()) {
                    uploader.upload();
                    $(this).text('上传中...');
                }
            } else {
                alert('请先选择照片！');
            }
        });

        // 添加上传完成回调
        uploader.on('uploadFinished', function() {
            $('.uploadBtn').text('立即上传').removeClass('disabled');
        });
    });

})( jQuery );