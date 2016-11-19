import {utility} from '../../app.utility';
import {jamplayerModule} from '../jamplayer.module';

constructor.$inject = ["$q", "$http"];
function constructor($q, $http) {
    let playerStore = {};
    let audioContext = null;

    const defaultConfig = {
        canMove: true,
        canTrim: true,
        canCopy: true,
        canDelete: true,
        duration: 150
    };

    const defaultState = {
        isPlaying: false,
        currentTime: 0,
        volume: 1,
        isMuted: false,
        doRepeat: false
    };

    const defaultRepeat = {
        start: 0,
        end: 100
    };

    const defaultTrackRegion = {
        color: "rgba(0, 0, 0, 0.1)",
        handleColor: "green"
    };

    const defaultSelectionRegion = {
        color: "rgba(0, 0, 0, 0.1)",
        handleColor: "green"
    };

    const defaultRepeatRegion = {
        color: "rgba(0, 0, 0, 0.1)",
        handleColor: "green"
    };

    const defaultModel = {
        id: "",
        config: defaultConfig,
        state: defaultState,
        trackRegion: defaultTrackRegion,
        selectionRegion: defaultSelectionRegion,
        repeatRegion: defaultRepeatRegion,
        tracks: [],
        repeat: defaultRepeat,
        waveSurferOptions: null,
        audioContext: null,
        onInit: utility.noOperation,
        onReady: utility.noOperation,
        onPlay: utility.noOperation,
        onPause: utility.noOperation,
        onFinish: utility.noOperation,
        onProgress: utility.noOperation,
        onTrackUpdated: utility.noOperation,
        onRequestRender: utility.noOperation
    };

    const REPEAT_REGION_ID = "repeat";
    const MINIMUM_REGION_LENGTH = 1;
    const REGION_HANDLE_WIDTH = 2;

    function Track(id, src) {
        this.id = id;
        this.src = src;
        this.path = src.url;
        this.title = src.trackName;
        this.author = src.author;
        this.duration = src.duration;
        this.startTime = src.startTime;
        this.startTrim = src.startTrim;
        this.endTrim = src.endTrim;
        this.buffer = null;
        this.promise = null;
        this.region = null;
        this.zIndex = 0;
    }

    Object.defineProperty(Track.prototype, "endTime", {
        get: function () { return this.startTime + this.duration - this.startTrim - this.endTrim; }
    });

    Track.prototype.updateSourceMeta = function() {
        this.src.url = this.path;
        this.src.trackName = this.title;
        this.src.author = this.author;
        this.src.duration = this.duration;
        this.src.startTime = this.startTime;
        this.src.startTrim = this.startTrim;
        this.src.endTrim = this.endTrim;
    };

    Track.prototype.adjustEndTrim = function(timelineDuration) {
        if (this.endTime > timelineDuration) {
            const trimToAdd = this.endTime - timelineDuration;
            this.endTrim += trimToAdd;
        }
    };

    function WaveSurferPlayer(model) {
        const mergedModel = angular.extend({}, defaultModel, model);
        angular.extend(model, mergedModel);
        this.id = model.id;
        this.audioContext = model.audioContext || getAudioContext();
        this.audioBuffer = createAudioBuffer(model.config.duration, this.audioContext);
        this.waveSurfer = null;
        this.tracks = null;
        this.lastPlayTime = -1;
        this.model = model;
        this.state = model.state;
        this.config = model.config;
        this.isDestroying = false;
        this.repeat = defaultRepeat;
        this.selectedTrackId = 0;
        this.topmostZIndex = 0;
        this.idCounter = 0;
    }

    WaveSurferPlayer.prototype.initialize = function (element) {
        const waveSurferOptions = angular.extend({}, this.model.waveSurferOptions);
        waveSurferOptions.container = element.children()[0];
        waveSurferOptions.audioContext = this.audioContext;
        this.waveSurfer = window.WaveSurfer.create(waveSurferOptions);
        this.initializePlayerTracks();
        this.updateAudioBuffer();
        this.drawRegions();
        this.registerWaveSurferEvents();
        const player = this;
        this.loadTrackBuffers().then(function () {
            player.waveSurfer.setVolume(player.state.volume);
            if (player.state.isMuted) player.toggleMute();
            player.model.onReady(player);
        }, null, function (track) {
            track.duration = track.buffer.duration;
            track.adjustEndTrim(player.config.duration);
            track.updateSourceMeta();
            track.region.end = track.endTime;
            player.updateAudioBuffer();
            player.drawRegions();
        });
        this.model.onInit(this);
    };

    WaveSurferPlayer.prototype.initializePlayerTracks = function () {
        let timelinePosition = 0;
        const startGapOfNewTrack = 5;
        const player = this;
        this.tracks = this.model.tracks.map(function (source, index) {
            const track = new Track(player.idCounter++, source);

            // add gap before new tracks
            if (angular.isUndefined(track.startTime)) {
                track.startTime = index > 0 ? timelinePosition + startGapOfNewTrack : timelinePosition;
            }
            track.duration = Number(track.duration);
            track.adjustEndTrim(player.config.duration);
            const region = {
                start: track.startTime,
                end: track.endTime
            };
            track.region = region;
            timelinePosition = region.end;
            return track;
        });
    };

    WaveSurferPlayer.prototype.updateAudioBuffer = function () {
        if (this.isDestroying) { return; }
        const player = this;
        resetAudioBuffer(this.audioBuffer);

        this.tracks.forEach(function (track) {
            if (track.startTime > player.config.duration) { return; }
            if (track.buffer) {
                const bufferStartIndex = track.startTime * track.buffer.sampleRate;
                const trackStartIndex = track.startTrim * track.buffer.sampleRate;
                if (track.buffer.duration <= track.endTrim) { return; }
                let trackEndIndex = (track.buffer.duration - track.endTrim) * track.buffer.sampleRate;

                // adjust source range length for 'track.buffer'
                if (trackEndIndex >= track.buffer.length) {
                    trackEndIndex = track.buffer.length - 1;
                }

                // adjust source range length for 'audioBuffer'
                const trackLength = trackEndIndex - trackStartIndex;
                const bufferEndIndex = bufferStartIndex + trackLength;
                if (bufferEndIndex >= player.audioBuffer.length) {
                    trackEndIndex -= (bufferEndIndex - player.audioBuffer.length);
                }

                forEachChannel(player.audioBuffer, function (playerData, channelNo) {
                    if (channelNo >= track.buffer.numberOfChannels) { return; }
                    const trackData = track.buffer.getChannelData(channelNo);
                    playerData.set(trackData.subarray(trackStartIndex, trackEndIndex), bufferStartIndex);
                });
            }
        });

        const wasPlaying = this.model.state.isPlaying;
        const currentTime = Math.round(this.model.state.currentTime);
        this.waveSurfer.empty();
        this.waveSurfer.loadDecodedBuffer(this.audioBuffer);
        if (wasPlaying) {
            this.waveSurfer.play(currentTime);
        } else {
            this.waveSurfer.seekTo(currentTime / this.config.duration);
        }
    };

    WaveSurferPlayer.prototype.drawTrackRegions = function () {
        if (this.isDestroying) { return; }
        if (!this.tracks.length) { return; }
        const player = this;

        this.tracks.forEach(function (track) {
            if (track.region.start >= player.config.duration) { return; }
            let color = player.model.trackRegion.color;
            let handleColor = player.model.trackRegion.handleColor;
            if (track.id === player.selectedTrackId) {
                color = player.model.selectionRegion.color;
                handleColor = player.model.selectionRegion.handleColor;
            }
            player.waveSurfer.addRegion({
                id: track.id,
                start: track.region.start,
                end: track.region.end,
                drag: player.config.canMove,
                resize: player.config.canTrim,
                minLength: MINIMUM_REGION_LENGTH,
                showProgress: !track.buffer,
                //maxLength: track.duration,
                color: color,
                handleWidth: REGION_HANDLE_WIDTH,
                handleColor: handleColor
            });
        });
    };

    WaveSurferPlayer.prototype.toggleMute = function () {
        this.waveSurfer.toggleMute();
        this.model.state.isMuted = this.waveSurfer.isMuted;
    };

    WaveSurferPlayer.prototype.destroy = function () {
        this.isDestroying = true;
        this.waveSurfer.destroy();
        destroyAudioBuffer(this.audioBuffer);
    };

    WaveSurferPlayer.prototype.setRepeat = function (start, end) {
        this.state.doRepeat = true;
        this.repeat = {
            start: angular.isDefined(start) ? start : this.repeat.start,
            end: angular.isDefined(end) ? end : this.repeat.end
        };
        this.drawRegions();
    };

    WaveSurferPlayer.prototype.clearRepeat = function () {
        this.state.doRepeat = false;
        this.drawRegions();
    };

    WaveSurferPlayer.prototype.drawRepeatRegion = function () {
        if (!this.state.doRepeat || !this.repeat) return;
        this.waveSurfer.addRegion({
            id: REPEAT_REGION_ID,
            start: this.repeat.start,
            end: this.repeat.end,
            drag: true,
            resize: true,
            loop: true,
            minLength: MINIMUM_REGION_LENGTH,
            color: this.model.repeatRegion.color,
            handleWidth: REGION_HANDLE_WIDTH,
            handleColor: this.model.repeatRegion.handleColor
        });
    };

    WaveSurferPlayer.prototype.drawRegions = function () {
        this.clearRegions();
        this.drawTrackRegions();
        if (this.state.doRepeat) {
            this.drawRepeatRegion();
        }
        this.model.onRequestRender();
    };

    WaveSurferPlayer.prototype.clearRegions = function () {
        this.waveSurfer.clearRegions();
    };

    WaveSurferPlayer.prototype.copySelectedTrack = function () {
        if (!this.config.canCopy) { return; }
        let selectedTrack = this.getTrackById(this.selectedTrackId);
        if (!selectedTrack) { return; }

        const trackEndTimes = this.tracks.map(function (track) {
            return track.endTime;
        });
        const maxEndTime = Math.max.apply(this, trackEndTimes) + 1;
        if (maxEndTime >= this.config.duration - 1) { return; }

        selectedTrack.updateSourceMeta();
        selectedTrack.zIndex = ++this.topmostZIndex;
        const newSrcTrack = angular.extend({}, selectedTrack.src);
        const newTrack = new Track(this.idCounter++, newSrcTrack);

        newTrack.startTime = maxEndTime;
        newTrack.adjustEndTrim(this.config.duration);
        newTrack.updateSourceMeta();
        newTrack.region = {
            start: newTrack.startTime,
            end: newTrack.endTime
        };
        newTrack.promise = selectedTrack.promise;
        newTrack.buffer = selectedTrack.buffer;

        if (newTrack.promise) {
            newTrack.promise.then(function (buffer) {
                newTrack.buffer = buffer;
            });
        }

        this.model.tracks.push(newSrcTrack);
        this.tracks.push(newTrack);
        this.updateAudioBuffer();
        this.drawRegions();
        this.model.onTrackUpdated(newTrack.src);
    };

    WaveSurferPlayer.prototype.deleteSelectedTrack = function () {
        if (!this.config.canDelete) { return; }
        const index = this.getTrackIndex(this.selectedTrackId);
        if (index === -1) { return; }
        this.tracks.splice(index, 1);
        this.model.tracks.splice(index, 1);
        if (this.tracks[index]) {
            this.selectedTrackId = this.tracks[index].id;
        } else if (this.tracks[0]) {
            this.selectedTrackId = this.tracks[0].id;
        }
        this.model.onTrackUpdated();
        this.updateAudioBuffer();
        this.drawRegions();
    };

    WaveSurferPlayer.prototype.loadTrackBuffers = function () {
        const promises = [];
        const deferred = $q.defer();
        const player = this;
        this.tracks.forEach(function (track) {
            track.promise = getTrackPromise(track);
            track.promise.then(function (buffer) {
                delete track.promise;
                track.buffer = buffer;
                deferred.notify(track);
            });
            promises.push(track.promise);
        });
        $q.all(promises).then(function () {
            deferred.resolve(player.tracks);
        });
        return deferred.promise;

        function getIdentiticalTrack(track) {
            let playerTrack = null;
            for (let i = 0; i < player.tracks.length; i++) {
                if (player.tracks[i].path === track.path) {
                    playerTrack = player.tracks[i];
                    break;
                }
            }
            return playerTrack;
        }

        function getTrackPromise(track) {
            let identicalTrack = getIdentiticalTrack(track);
            if (!identicalTrack)
                return getAudioBufferFromFile(track.path, player.audioContext);
            if (identicalTrack.buffer)
                return $q.when(identicalTrack.buffer);
            if (identicalTrack.promise)
                return identicalTrack.promise;
            return getAudioBufferFromFile(track.path, player.audioContext);
        }
    };

    WaveSurferPlayer.prototype.registerWaveSurferEvents = function () {
        const player = this;
        this.waveSurfer.on('seek', function () {
            player.handleSeekEvent();
        });
        this.waveSurfer.on('audioprocess', function (time) {
            player.handleAudioProcessEvent(time);
        });
        this.waveSurfer.on('region-update-end', function (region) {
            player.handleRegionUpdateEndEvent(region);
        });
        this.waveSurfer.on('play', function () {
            player.handlePlayEvent();
        });
        this.waveSurfer.on('pause', function () {
            player.handlePauseEvent();
        });
        this.waveSurfer.on('finish', function () {
            player.handleFinishEvent();
        });
    };

    WaveSurferPlayer.prototype.handleSeekEvent = function () {
        this.state.currentTime = this.waveSurfer.getCurrentTime();
        this.model.onProgress(this.state.currentTime);
        this.lastPlayTime = this.state.currentTime - 1;
    };

    WaveSurferPlayer.prototype.handleAudioProcessEvent = function (time) {
        time = Math.round(time);
        if (time > this.lastPlayTime) {
            this.state.currentTime = time;
            this.model.onProgress(time);
            this.lastPlayTime = time;
        }
    };

    WaveSurferPlayer.prototype.handlePlayEvent = function () {
        this.state.isPlaying = true;
        this.lastPlayTime = -1;
        this.model.onPlay();
    };

    WaveSurferPlayer.prototype.handlePauseEvent = function () {
        this.state.isPlaying = false;
        this.model.onPause();
    };

    WaveSurferPlayer.prototype.handleFinishEvent = function () {
        this.waveSurfer.seekTo(0);
        this.state.isPlaying = false;
        this.drawRegions();
        this.model.onFinish();
    };

    WaveSurferPlayer.prototype.handleRegionUpdateEndEvent = function (region) {
        // this segment adds snap-to-grid functionality
        region.start = Math.round(region.start);
        region.end = Math.round(region.end);

        const regionId = region.id;
        if (regionId === REPEAT_REGION_ID) {
            this.repeat.start = region.start;
            this.repeat.end = region.end;
            return;
        }

        let track = this.getTrackById(regionId);
        if (!track) { return; }
        this.selectedTrackId = regionId;
        track.zIndex = ++this.topmostZIndex;

        if (this.isTrimEvent(region, track.region)) {
            this.handleTrimEvent(track, region);
            track.updateSourceMeta();
            this.model.onTrackUpdated(track.src);
        } else if (this.isMoveEvent(region, track.region)) {
            this.handleMoveEvent(track, region);
            track.updateSourceMeta();
            this.model.onTrackUpdated(track.src);
        }
        this.sortTracksByZIndex();
        this.updateAudioBuffer();
        this.drawRegions();
    };

    WaveSurferPlayer.prototype.getTrackIndex = function (trackId) {
        let index = -1;
        for (let i = 0; i < this.tracks.length; i++) {
            if (this.tracks[i].id === trackId) {
                index = i;
                break;
            }
        }
        return index;
    };

    WaveSurferPlayer.prototype.getTrackById = function (trackId) {
        return this.tracks[this.getTrackIndex(trackId)];
    };

    WaveSurferPlayer.prototype.sortTracksByZIndex = function () {
        this.tracks.sort(function (a, b) {
            return a.zIndex - b.zIndex;
        });
    };

    WaveSurferPlayer.prototype.isMoveEvent = function (newRegion, oldRegion) {
        const newLength = Math.round(newRegion.end - newRegion.start);
        const oldLength = Math.round(oldRegion.end - oldRegion.start);
        return newLength === oldLength && Math.round(newRegion.start) !== Math.round(oldRegion.start);
    };

    WaveSurferPlayer.prototype.isTrimEvent = function (newRegion, oldRegion) {
        const newLength = Math.round(newRegion.end - newRegion.start);
        const oldLength = Math.round(oldRegion.end - oldRegion.start);
        return newLength !== oldLength;
    };

    WaveSurferPlayer.prototype.handleMoveEvent = function (track, region) {
        track.startTime = region.start;
        track.region.start = region.start;
        track.region.end = region.end;
    };

    WaveSurferPlayer.prototype.handleTrimEvent = function (track, region) {
        const deltaRegionStart = region.start - track.region.start;
        const deltaRegionEnd = track.region.end - region.end;

        // do nothing if both start and end handle moved
        if (deltaRegionStart !== 0 && deltaRegionEnd !== 0) return;

        const newStartTime = track.startTime + deltaRegionStart;
        const newStartTrim = track.startTrim + deltaRegionStart;
        const newEndTrim = track.endTrim + deltaRegionEnd;

        track.startTime = newStartTime;
        track.startTrim = newStartTrim > 0 ? newStartTrim : 0;
        track.endTrim = newEndTrim > 0 ? newEndTrim : 0;

        if (newStartTrim < 0)
            track.startTime -= newStartTrim;

        region.start = track.startTime;
        region.end = track.endTime;
        track.region.start = region.start;
        track.region.end = region.end;
    };

    function createOfflineAudioContext(duration) {
        const noOfChannels = 2;
        const sampleRate = 44100;
        const OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        return new OfflineAudioContext(noOfChannels, sampleRate * duration, sampleRate);
    }

    function createAudioContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        return new AudioContext();
    }

    function getAudioContext() {
        if (audioContext) return audioContext;
        audioContext = createAudioContext();
        return audioContext;
    }

    function forEachChannel(audioBuffer, callback) {
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            if (!angular.isFunction(callback)) return;
            callback(audioBuffer.getChannelData(i), i);
        }
    }

    function resetAudioBuffer(buffer) {
        forEachChannel(buffer, function (data) {
            for (let i = 0; i < data.length; i++) {
                data[i] = 0;
            }
        });
    }

    function destroyAudioBuffer(buffer) {
        forEachChannel(buffer, function (data) {
            data = null;
        });
        buffer = null;
    }

    function createAudioBuffer(duration, audioContext) {
        const noOfChannels = 2;
        return audioContext.createBuffer(noOfChannels, duration * audioContext.sampleRate, audioContext.sampleRate);
    }

    function getAudioBufferFromFile(path, audioContext) {
        return $http.get(path, { responseType: "arraybuffer" }).then(function (response) {
            return $q(function (resolve) {
                audioContext.decodeAudioData(response.data, function (buffer) {
                    delete response.data;
                    resolve(buffer);
                });
            });
        });
    }

    function addPlayer(model) {
        const player = new WaveSurferPlayer(model);
        playerStore[model.id] = player;
    }

    function initializePlayer(id, element) {
        playerStore[id].initialize(element);
        return playerStore[id];
    }

    function getPlayer(id) {
        return playerStore[id];
    }

    function resetPlayers() {
        if (playerStore) playerStore = {};
    }

    function removePlayer(id) {
        delete playerStore[id];
    }

    this.addPlayer = addPlayer;
    this.initializePlayer = initializePlayer;
    this.getPlayer = getPlayer;
    this.resetPlayers = resetPlayers;
    this.removePlayer = removePlayer;
}

jamplayerModule.service('waveSurferPlayerService', constructor);