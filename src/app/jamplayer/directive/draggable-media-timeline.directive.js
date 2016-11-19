(function (angular) {
    "use strict";

    function constructor($document) {

        return {
            restrict: 'EA',
            replace: true,
            scope: {
                id: "@",
                alt: "@",
                src: "@",
                draggable: "=",
                trackPositions: "=",
                activeGrid: "=",
                trackDuration: "=",
                threshold: "@",
                timelineDuration: "@",
                pixelPerSecond: "@",
                secondPerGrid: "@"
            },
            template: "<div class='overflow-hidden height-40 overlay-25'" +
            "ng-class='{\"cur-pointer\": draggable}'>" +
            "<img id='_{{::id}}' alt='{{::alt}}' " +
            "class='jam-audio-wave' " +
            "ng-style='{\"min-width\": getImageWidth() + \"px\"}' " +
            "ng-src='{{::src}}' />" +
            "</div>",
            link: function (scope, elem, attrs) {
                var startX,
                    x = 0,
                    imageContainer, imageContent, imageContainerId, imageContentId, tunePadding = scope.threshold,
                    containerWidth = elem[0].clientWidth,
                    imageContainerId = attrs.id,
                    imageContentId = "_" + attrs.id,
                    snapAria = scope.pixelPerSecond * (scope.secondPerGrid ? scope.secondPerGrid : 1),
                    activeGridUpdated = false;
                //scope.imageWidth = Math.ceil((containerWidth * scope.trackDuration) / scope.timelineDuration);
                scope.getImageWidth = function() {
                    if(scope.trackDuration == NaN) return 0;
                    return Math.ceil((containerWidth * scope.trackDuration) / scope.timelineDuration);
                };

                elem.on('mousedown', function (e) {
                    if (scope.draggable) {
                        e.preventDefault();
                        setContentAndContainerBoundary();
                        startX = e.clientX - document.getElementById(imageContentId).offsetLeft;
                        $document.on('mousemove', mousemove);
                        $document.on('mouseup', mouseup);
                    }
                });

                function setContentAndContainerBoundary() {
                    imageContainer = document.getElementById(imageContainerId).getBoundingClientRect();
                    imageContent = document.getElementById(imageContentId).getBoundingClientRect();
                }

                function mousemove(e) {
                    if (scope.draggable) {
                        x = e.clientX - startX;
                        setPosition(e);
                        scope.activeGrid = Math.round(Math.round(x / snapAria) * snapAria);
                        activeGridUpdated = true;
                    }
                }

                function mouseup(e) {
                    if (scope.draggable) {
                        $document.unbind('mousemove', mousemove);
                        $document.unbind('mouseup', mouseup);

                        if(activeGridUpdated) {
                            activeGridUpdated = false;
                            if (!appSuite.isProductionBuild) console.log('x before ', x);
                            x = scope.activeGrid;
                            if (!appSuite.isProductionBuild) console.log('x after ', x);
                            setPosition();
                        }
                    }
                    //scope.activeGrid = -1;
                }

                elem.on('touchstart', function (e) {
                    e.preventDefault();
                    setContentAndContainerBoundary();
                    startX = e.touches[0].clientX - document.getElementById(imageContentId).offsetLeft;
                    elem.on('touchmove', touchmove);
                    elem.on('touchend', touchend);
                });

                function touchmove(e) {
                    if (scope.draggable) {
                        x = e.touches[0].clientX - startX;
                        setPosition(e.touches[0]);
                    }
                }

                function touchend(e) {
                    $document.unbind('touchmove', touchmove);
                    $document.unbind('touchend', touchend);
                }

                function setPosition(e) {
                    if (imageContainer) {
                        var contentWidth = parseInt(imageContent.width);
                        //var containerWidth = parseInt(imageContainer.width);
                        if (x <= -((imageContent.right - imageContent.left) - tunePadding)) {
                            x = -((imageContent.right - imageContent.left) - tunePadding);
                        } else if (x > ((imageContainer.right - imageContainer.left) - tunePadding)) {
                            x = ((imageContainer.right - imageContainer.left) - tunePadding);
                        }

                        if (x < 0) {
                            scope.trackPositions = {
                                start: x / contentWidth,
                                end: (contentWidth + x) / containerWidth
                            };
                        } else if (x > containerWidth) {
                            scope.trackPositions = {
                                start: x / containerWidth,
                                end: ((contentWidth + x)) / contentWidth
                            };
                        } else {
                            scope.trackPositions = {
                                start: x / containerWidth,
                                end: (contentWidth + x) / containerWidth
                            };
                        }
                        scope.$apply();
                    }
                    document.getElementById(imageContentId).style.left = x + "px";
                }
            }
        };
    }

    constructor.$inject = ["$document"];
    angular.module("draggableMediaTimelineModule", []).directive('draggableMediaTimeline', constructor);
})(window.angular);