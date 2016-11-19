(function (waveSurfer) {
    "use strict";
    
    waveSurfer.Region.init = function (params, wavesurfer) {
        this.wavesurfer = wavesurfer;
        this.wrapper = wavesurfer.drawer.wrapper;;
        this.id = params.id == null ? waveSurfer.util.getId() : params.id;
        this.start = Number(params.start) || 0;
        this.end = params.end == null ?
            // small marker-like region
            this.start + (4 / this.wrapper.scrollWidth) * this.wavesurfer.getDuration() :
            Number(params.end);
        this.resize = params.resize === undefined ? true : Boolean(params.resize);
        this.drag = params.drag === undefined ? true : Boolean(params.drag);
        this.loop = Boolean(params.loop);
        this.color = params.color || 'rgba(0, 0, 0, 0.1)';
        this.data = params.data || {};
        this.attributes = params.attributes || {};
        this.maxLength = params.maxLength;
        this.minLength = params.minLength || 0;
        this.handleWidth = params.handleWidth || 2;
        this.handleColor = params.handleColor || "gray";
        this.showProgress = params.showProgress || false;
        this.bindInOut();
        this.render();
        this.wavesurfer.on('zoom', this.updateRender.bind(this));
        this.wavesurfer.fireEvent('region-created', this);
    }

    function addProgressCircle(element, width, height) {
        element.setAttribute('layout', "column");
        var loader = element.appendChild(document.createElement('div'));
        loader.setAttribute('flex', '');
        loader.setAttribute('layout', 'row');
        loader.setAttribute('layout-align', 'center center');
        loader = loader.appendChild(document.createElement('md-progress-circular'));
        loader.setAttribute('md-mode', 'indeterminate');
        var circleDiameter = Math.min(width, height);
        loader.setAttribute('md-diameter', circleDiameter < 20 ? circleDiameter: 20);
    }

    waveSurfer.Region.render = function () {
        var regionEl = document.createElement('region');
        regionEl.className = 'wavesurfer-region';
        regionEl.title = this.formatTime(this.start, this.end);
        regionEl.setAttribute('data-id', this.id);

        if (this.showProgress) {
            var dur = this.wavesurfer.getDuration();
            var left = Math.round(this.start / dur * this.wrapper.scrollWidth);
            var regionWidth = Math.round(this.end / dur * this.wrapper.scrollWidth) - left;
            var regionHeight = this.wavesurfer.params.height;
            addProgressCircle(regionEl, regionWidth, regionHeight);
        }

        for (var attrname in this.attributes) {
            regionEl.setAttribute('data-region-' + attrname, this.attributes[attrname]);
        }

        this.style(regionEl, {
            position: 'absolute',
            zIndex: 2,
            height: '100%',
            top: '0px'
        });

        if (this.resize) {
            var handleLeft = regionEl.appendChild(document.createElement('handle'));
            var handleRight = regionEl.appendChild(document.createElement('handle'));
            handleLeft.className = 'wavesurfer-handle wavesurfer-handle-start';
            handleRight.className = 'wavesurfer-handle wavesurfer-handle-end';
            var css = {
                backgroundColor: this.handleColor,
                cursor: 'col-resize',
                position: 'absolute',
                left: -this.handleWidth + 'px',
                top: '0px',
                width: this.handleWidth + 'px',
                height: '100%'
            };
            this.style(handleLeft, css);
            this.style(handleRight, css);
            this.style(handleRight, {
                left: '100%'
            });
        }

        this.element = this.wrapper.appendChild(regionEl);
        this.updateRender();
        this.bindEvents(regionEl);
    }

    waveSurfer.Region.updateRender = function (pxPerSec) {
        var dur = this.wavesurfer.getDuration();
        var width;
        if (pxPerSec) {
            width = Math.round(this.wavesurfer.getDuration() * pxPerSec);
        }
        else {
            width = this.wrapper.scrollWidth;
        }

        if (this.start < 0) {
            this.start = 0;
            this.end = this.end - this.start;
        }

        if (this.end <= this.start) {
            this.end = this.start + this.minLength;
        }

        if (this.end > dur) {
            var length = this.end - this.start;
            this.end = dur;
            this.start = this.end - length;
        }

        if (this.minLength != null) {
            this.end = Math.max(this.start + this.minLength, this.end);
        }

        if (this.maxLength != null) {
            this.end = Math.min(this.start + this.maxLength, this.end);
        }

        if (this.element != null) {
            // Calculate the left and width values of the region such that
            // no gaps appear between regions.
            var left = Math.round(this.start / dur * width);
            var regionWidth =
                Math.round(this.end / dur * width) - left;

            this.style(this.element, {
                left: left + 'px',
                width: regionWidth + 'px',
                backgroundColor: this.color,
                cursor: this.drag ? 'move' : 'default'
            });

            for (var attrname in this.attributes) {
                this.element.setAttribute('data-region-' + attrname, this.attributes[attrname]);
            }

            this.element.title = this.formatTime(this.start, this.end);
        }
    }

    waveSurfer.Region.bindEvents = function () {
        var my = this;

        this.element.addEventListener('mouseenter', function (e) {
            my.fireEvent('mouseenter', e);
            my.wavesurfer.fireEvent('region-mouseenter', my, e);
        });

        this.element.addEventListener('mouseleave', function (e) {
            my.fireEvent('mouseleave', e);
            my.wavesurfer.fireEvent('region-mouseleave', my, e);
        });

        this.element.addEventListener('click', function (e) {
            e.preventDefault();
            my.fireEvent('click', e);
            my.wavesurfer.fireEvent('region-click', my, e);
        });

        this.element.addEventListener('dblclick', function (e) {
            e.stopPropagation();
            e.preventDefault();
            my.fireEvent('dblclick', e);
            my.wavesurfer.fireEvent('region-dblclick', my, e);
        });

        /* Drag or resize on mousemove. */
        (this.drag || this.resize) && (function () {
            var duration = my.wavesurfer.getDuration();
            var drag;
            var resize;
            var delta;
            var startTime;
            var touchId;

            var onDown = function (e) {
                if (e.touches && e.touches.length > 1) { return; }
                touchId = e.targetTouches ? e.targetTouches[0].identifier : null;

                e.stopPropagation();
                startTime = my.wavesurfer.drawer.handleEvent(e, true) * duration;

                if (e.target.tagName.toLowerCase() == 'handle') {
                    if (e.target.classList.contains('wavesurfer-handle-start')) {
                        resize = 'start';
                    } else {
                        resize = 'end';
                    }
                } else {
                    drag = true;
                    resize = false;
                }
            };
            var onUp = function (e) {
                if (e.touches && e.touches.length > 1) { return; }

                if (drag || resize) {
                    my.fireEvent('update-end', e);
                    my.wavesurfer.fireEvent('region-update-end', my, e, resize, !!delta);
                    drag = false;
                    resize = false;
                }
            };
            var onMove = function (e) {
                if (e.touches && e.touches.length > 1) { return; }
                if (e.targetTouches && e.targetTouches[0].identifier != touchId) { return; }

                if (drag || resize) {
                    var time = my.wavesurfer.drawer.handleEvent(e) * duration;
                    delta = time - startTime;
                    startTime = time;

                    // Drag
                    if (my.drag && drag) {
                        my.onDrag(delta);
                    }

                    // Resize
                    if (my.resize && resize) {
                        my.onResize(delta, resize);
                    }
                }
            };

            my.element.addEventListener('mousedown', onDown);
            my.element.addEventListener('touchstart', onDown);

            my.wrapper.addEventListener('mousemove', onMove);
            my.wrapper.addEventListener('touchmove', onMove);

            document.body.addEventListener('mouseup', onUp);
            document.body.addEventListener('touchend', onUp);

            my.on('remove', function () {
                document.body.removeEventListener('mouseup', onUp);
                document.body.removeEventListener('touchend', onUp);
                my.wrapper.removeEventListener('mousemove', onMove);
                my.wrapper.removeEventListener('touchmove', onMove);
            });

            my.wavesurfer.on('destroy', function () {
                document.body.removeEventListener('mouseup', onUp);
                document.body.removeEventListener('touchend', onUp);
            });
        }());
    }
})(window.WaveSurfer)