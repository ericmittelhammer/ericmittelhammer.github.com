window.onload = function() {
                var myCanvas = document.getElementById("board");
                var curColor = $('#selectColor option:selected').val();
                if(myCanvas){
                                var isDown      = false;
                                var ctx = myCanvas.getContext("2d");
                                var canvasX, canvasY;
                                ctx.lineWidth = 20;
                                ctx.lineCap = "round";
                                ctx.lineJoin = "round";
                                 
                                $(myCanvas)
                                .mousedown(function(e){
                                                isDown = true;
                                                ctx.beginPath();
                                                canvasX = e.pageX - myCanvas.offsetLeft;
                                                canvasY = e.pageY - myCanvas.offsetTop;
                                                ctx.moveTo(canvasX, canvasY);
                                })
                                .mousemove(function(e){
                                                if(isDown != false) {
                                                        canvasX = e.pageX - myCanvas.offsetLeft;
                                                        canvasY = e.pageY - myCanvas.offsetTop;
                                                        ctx.lineTo(canvasX, canvasY);
                                                        ctx.strokeStyle = curColor;
                                                        ctx.stroke();
                                                }
                                })
                                .mouseup(function(e){
                                                isDown = false;
                                                ctx.closePath();
                                });
                }
                 
                $('#selectColor').change(function () {
                                curColor = $('#selectColor option:selected').val();
                });

                  // Fill white
                  ctx.fillStyle = "rgb(255,255,255)";
                  ctx.fillRect(0,0,myCanvas.width, myCanvas.height);
                  myCanvas.style.opacity = '1';

                 
        };