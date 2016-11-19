(function (window, waveSurfer) {
    "use strict";

    waveSurfer.WebAudio.getPeaks = function (length) {
        if (this.peaks) { return this.peaks; }
        var sampleSize = this.buffer.length / length;
        var sampleStep = 1;
        var channels = this.buffer.numberOfChannels;
        var splitPeaks = [];
        var mergedPeaks = [];
        for (var c = 0; c < channels; c++) {
            var peaks = splitPeaks[c] = [];
            var chan = this.buffer.getChannelData(c);
            for (var i = 0; i < length; i++) {
                var start = ~~(i * sampleSize);
                var end = ~~(start + sampleSize);
                var posSum = 0, negSum = 0;
                var count = 0;
                for (var j = start; j < end; j += sampleStep) {
                    var value = chan[j];
                    if (value > 0) {
                        posSum += value;
                    } else {
                        negSum += value;
                    }
                    count++;
                }
                var max = posSum / count;
                var min = negSum / count;

                peaks[2 * i] = max;
                peaks[2 * i + 1] = min;

                if (c === 0 || max > mergedPeaks[2 * i]) {
                    mergedPeaks[2 * i] = max;
                }

                if (c === 0 || min < mergedPeaks[2 * i + 1]) {
                    mergedPeaks[2 * i + 1] = min;
                }
            }
        }
        return this.params.splitChannels ? splitPeaks : mergedPeaks;
    }
})(window, window.WaveSurfer)