// bia.js - This is the rewrite of the spa.js file. It provides a basic Single Page Application framework for simple
// sites. It does not implement lazy loading right now meaning that at large scales performance it likely to be dodgy
// at best.
(function () {
    /**
     * The list of ids of regions that have been required by the entire system
     * @type {Array}
     */
    let loadedRegions = [];

    /**
     * A wrapper around the console output functions to provide an easier and more descriptive way to dump data
     * @type {{error: log.error, warn: log.warn, info: log.info, debug: log.debug, log: log.log}}
     */
    let log = {
        /**
         * Log the given message to {@link console.error} with each of the given pieces of data being output each on their own output
         * entry. The message will be prefixed with 'bia-loader' to indicate the origin of the error message more clearly
         * @param {string} message the message to log to the console
         * @param {...*} data the data elements to log to the console, each with their own output call
         */
        error: function (message, ...data) {
            console.error('[bia-loader | ERROR]: ' + message);
            for (let i = 0; i < data.length; i++) console.error(data[i]);
        },
        /**
         * Log the given message to {@link console.warn} with each of the given pieces of data being output each on their own output
         * entry. The message will be prefixed with 'bia-loader' to indicate the origin of the error message more clearly
         * @param {string} message the message to log to the console
         * @param {...*} data the data elements to log to the console, each with their own output call
         */
        warn: function (message, ...data) {
            console.warn('[bia-loader | WARN]: ' + message);
            for (let i = 0; i < data.length; i++) console.warn(data[i]);
        },
        /**
         * Log the given message to {@link console.log} with each of the given pieces of data being output each on their own output
         * entry. The message will be prefixed with 'bia-loader' to indicate the origin of the error message more clearly
         * @param {string} message the message to log to the console
         * @param {...*} data the data elements to log to the console, each with their own output call
         */
        info: function (message, ...data) {
            console.info('[bia-loader | INFO]: ' + message);
            for (let i = 0; i < data.length; i++) console.info(data[i]);
        },
        /**
         * Log the given message to {@link console.debug} with each of the given pieces of data being output each on their own output
         * entry. The message will be prefixed with 'bia-loader' to indicate the origin of the error message more clearly
         * @param {string} message the message to log to the console
         * @param {...*} data the data elements to log to the console, each with their own output call
         */
        debug: function (message, ...data) {
            console.debug('[bia-loader | DEBUG]: ' + message);
            for (let i = 0; i < data.length; i++) console.debug(data[i]);
        },
        /**
         * Log the given message to {@link console.log} with each of the given pieces of data being output each on their own output
         * entry. The message will be prefixed with 'bia-loader' to indicate the origin of the error message more clearly
         * @param {string} message the message to log to the console
         * @param {...*} data the data elements to log to the console, each with their own output call
         */
        log: function (message, ...data) {
            console.log('[bia-loader | LOG]: ' + message);
            for (let i = 0; i < data.length; i++) console.log(data[i]);
        },
    };

    /**
     * Contains the configuration flags for the loader which change the way it will react to different load commands and
     * various eventualities in the loading process
     * @type {{insertion: {script: string, style: string, region: string}, dependencies: {missing: string, failed: string}}}
     */
    let configuration = {
        insertion: {
            script: 'body',
            style: 'head',
            region: 'body',
        },
        dependencies: {
            missing: 'load',
            failed: 'load',
        },
        swap: function (target, speed) {
            events.emit('swap', target);
            return new Promise(function (oResolve, oReject) {
                // If the region doesn't exist, reject it
                if (!loadedRegions.includes(target)) {
                    oReject(loadedRegions);
                    return;
                }

                // Update to the default if one has not been specified
                if (speed === undefined) speed = 300;

                // Fade out every element and wait until all have completed before fading in the target
                let promises = [];
                $('[data-bia-region]').each(function () {
                    let that = $(this);
                    promises.push(new Promise(function (resolve) {
                        that.fadeOut(speed, function () {
                            resolve();
                        });
                    }));
                });

                Promise.all(promises).then(function () {
                    let element = $('#' + target);
                    element.css('display', element.attr('data-bia-display')).hide().fadeIn(speed, function () {
                        expose('activeRegion', target);
                        oResolve();
                    });
                });
            });
        },
    };
    expose('swap', configuration.swap);

    /**
     * Update the configuration overwriting the given key with the given value if it exists or setting it if it does not
     * @param {string} key the key to set in the configuration
     * @param {*} value the value to set in the configuration
     * @return {boolean} if the configuration was set correctly
     */
    function configure(key, value) {
        if (key.indexOf('.') !== -1) {
            let active = configuration;
            let parts = key.split('.');

            try {
                for (let i = 0; i < parts.length - 1; i++) {
                    active = active[parts[i]];
                }

                active[parts[parts.length - 1]] = value;
                return true;
            } catch (e) {
                return false;
            }
        }
        configuration[key] = value;
        return true;
    }

    expose('configure', configure);

    /**
     * Represents the event emitter system through which functions can wait for certain events to fire or listen for
     * event time an event fires as well as firing an event
     * @type {{_listeners: {}, _waits: {}, on: (function(*=, *=): events), emit: (function(*=, ...[*]=): events), once: (function(*=, *=): events)}}
     */
    let events = {
        _listeners: {},
        _waits: {},
        on: function (event, callback) {
            if (this._listeners.hasOwnProperty(event)) {
                this._listeners[event].push(callback);
            } else {
                this._listeners[event] = [callback];
            }
            return this;
        },
        emit: function (event, ...data) {
            if (this._listeners.hasOwnProperty(event)) {
                for (let i = 0; i < this._listeners[event].length; i++) {
                    this._listeners[event][i].apply(null, data);
                }
            }
            if (this._waits.hasOwnProperty(event)) {
                for (let i = 0; i < this._waits[event].length; i++) {
                    this._waits[event][i].apply(null, data);
                }
                delete this._waits[event];
            }
            return this;
        },
        once: function (event, callback) {
            if (this._waits.hasOwnProperty(event)) {
                this._waits[event].push(callback);
            } else {
                this._waits[event] = [callback];
            }
            return this;
        },
    };
    expose('events', events);

    /**
     * A named function to expose a given value to the window object within the bia scope with the given name.
     * This is just used to make code more verbose and slightly clearer.
     * @param {string} name the name which the value should be bound to in the window bia object
     * @param {*} data the data to expose to the window bia scope
     */
    function expose(name, data) {
        if (window.hasOwnProperty('bia')) {
            window.bia[name] = data;
        } else {
            let object = {};
            object[name] = data;
            window['bia'] = object;
        }
    }

    /**
     * Attempts to fetch the attribute at the given key from the given element but will return the fallback if the value is not present in
     * the object.
     * @param {jQuery} element the element to query for the value
     * @param {string} attr the name of the attribute to try and access in the element
     * @param {*} fallback the value to return if the attribute is not present in the element
     * @return {string} the value corresponding with the given attribute in the given element if present or the fallback if not
     */
    function getAttrWithDefault(element, attr, fallback) {
        // noinspection JSUnresolvedFunction
        let attribute = element.attr(attr);
        if (attribute === undefined) return fallback;
        return attribute;
    }

    /**
     * Attempts to build a script load request from the given element which should establish the source of the script, the target of the script, the id and any dependencies
     * of the script and package it in an object which represents the load request. If the source or target are missing, a failure response will be returned as it
     * represents an invalid script load request as these are required parameters. The id and dependencies can be ommitted but will be replaced with defaults (the id will
     * just be the script name without the leading path or the trailing .js [if there is another .js in the file time, it will also be removed] and the dependencies will be
     * replaced with an empty array)
     * @param {jQuery} element the jQuery element that represents the script load command from which the details should be gathered
     * @return {object} an object containing the state of the load (success: boolean) and if successful a 'loadRequest' key which contains the real processable request
     */
    function buildScriptLoadData(element) {
        let src = getAttrWithDefault(element, 'src', undefined);
        let target = getAttrWithDefault(element, 'target', undefined);

        if (src === undefined) {
            log.warn('A script load element was include which did not contain a \'src\' tag. This is an invalid load request and will therefore be ignored.', element);
            return {
                success: false,
            };
        }
        if (target === undefined) {
            log.warn('A script load element was include which did not contain a \'target\' tag. This is an invalid load request and will therefore be ignored.', element);
            return {
                success: false,
            };
        }

        let id = getAttrWithDefault(element, 'id', src.substr(src.lastIndexOf('/') + 1).replace('.js', ''));
        let dependencies = getAttrWithDefault(element, 'dependencies', '').split(' ');

        // If the default value was converted into the dependencies then replace it with an empty array
        if (dependencies.length === 1 && dependencies[0] === '') dependencies = [];

        return {
            success: true,
            loadRequest: {
                type: 'script',
                target: target,
                src: src,
                id: id,
                dependencies: dependencies,
            },
        };
    }

    /**
     * Attempts to build a css load request from the given element which should establish the source of the CSS, if the style has been precompiled and if not, the target of
     * the style. If there is an invalid combination of properties or if the source is missing a failure response will be returned as it represents an invalid css load request.
     * @param {jQuery} element the jQuery element that represents the css load command from which the details should be gathered
     * @return {object} an object containing the state of the load (success: boolean) and if successful a 'loadRequest' key which contains the real processable request
     */
    function buildStyleLoadData(element) {
        let src = getAttrWithDefault(element, 'src', undefined);

        if (src === undefined) {
            log.warn('A css load element was include which did not contain a \'src\' tag. This is an invalid load request and will therefore be ignored.', element);
            return {
                success: false,
            };
        }

        let precompiled = getAttrWithDefault(element, 'precompiled', 'false') === 'true';
        let target = getAttrWithDefault(element, 'target', undefined);

        if (target === undefined && precompiled === false) {
            log.warn('A css load element was include which did not contain a \'target\' tag while not being precompiled. This is an invalid load request and will therefore be ignored.', element);
            return {
                success: false,
            };
        }

        return {
            success: true,
            loadRequest: {
                type: 'style',
                target: target,
                src: src,
                precompiled: precompiled,
            },
        };
    }

    /**
     * Attempts to build a region load request from the given element which should establish the source of the region, the id of the target into which it should be inserted
     * and css display that should be used when it is shown for real in the DOM. If either src or target are missing it will return a failure response as it is an invalid load request
     * but if display is left out it will default to block (as this is the default anyway in css for divs).
     * @param {jQuery} element the jQuery element that represents the region load command from which the details should be gathered
     * @return {object} an object containing the state of the load (success: boolean) and if successful a 'loadRequest' key which contains the real processable request
     */
    function buildRegionLoadData(element) {
        let src = getAttrWithDefault(element, 'src', undefined);
        let target = getAttrWithDefault(element, 'target', undefined);

        if (src === undefined) {
            log.warn('A region load element was include which did not contain a \'src\' tag. This is an invalid load request and will therefore be ignored.', element);
            return {
                success: false,
            };
        }
        if (target === undefined) {
            log.warn('A region load element was include which did not contain a \'target\' tag. This is an invalid load request and will therefore be ignored.', element);
            return {
                success: false,
            };
        }

        let display = getAttrWithDefault(element, 'display', 'block');

        return {
            success: true,
            loadRequest: {
                type: 'region',
                target: target,
                src: src,
                display: display,
            },
        };
    }

    /**
     * Attempt to locate the bia-load element in the given jQuery representation of the DOM element and extract each load entry and populate
     * the details of the load request with the given properties.
     * @param {jQuery} element the dom element in which to search for the load data
     * @return {Array} the array of resources to load
     */
    function buildLoadData(element) {
        let loadRequests = [];

        let loadElements = element.find('load');

        // If there are no load elements then we can just return an empty array as there is no more processing to do
        if (loadElements.length === 0) return loadRequests;

        loadElements.each(function () {
            let element = $(this);

            // This should refer to the type of resource being loaded if present
            let type = element.attr('type');
            // If the element does not define a type then it is invalid as a load statement so we simply skip it
            if (type === undefined) {
                log.warn('Load element existed in a \'bia-load\' element without specifying a type. This will be ignored', element);
                return;
            }

            if (type === 'script') {
                let result = buildScriptLoadData(element);
                if (result.success) {
                    let loadRequest = result.loadRequest;
                    loadRequest['state'] = loadStates.READY;
                    loadRequest['promise'] = undefined;

                    loadRequests.push(loadRequest);
                }
            }

            if (type === 'style') {
                let result = buildStyleLoadData(element);
                if (result.success) {
                    let loadRequest = result.loadRequest;
                    loadRequest['state'] = loadStates.READY;
                    loadRequest['promise'] = undefined;

                    loadRequests.push(loadRequest);
                }
            }

            if (type === 'region') {
                let result = buildRegionLoadData(element);
                if (result.success) {
                    let loadRequest = result.loadRequest;
                    loadRequest['state'] = loadStates.READY;
                    loadRequest['promise'] = undefined;

                    loadRequests.push(loadRequest);
                }
            }
        });

        return loadRequests;
    }

    /**
     * Contains the possible load states of a resource in this system. This should be used to determine if another resource is ready to load and to
     * report on the status of resources.
     * @type {{READY: number, LOADING: number, FAILED: number, LOADED: number, INJECTED: number}}
     */
    let loadStates = {
        READY: 0,
        LOADING: 1,
        FAILED: 2,
        LOADED: 3,
        INJECTED: 4,
    };

    /**
     * Holds every request for a resource
     * @type {[{state: number, type: string}]}
     */
    let loadRequests = [];

    /**
     * Attempts to find the index of the script load request in {@link loadRequests} with the given id
     * @param {string} id the id of the script to find
     * @return {number|undefined}
     */
    function getScriptLoadRequestID(id) {
        for (let i = 0; i < loadRequests.length; i++) {
            if (loadRequests[i].type === 'script' && loadRequests[i].id === id) return i;
        }
        return undefined;
    }

    /**
     * Attempts to load the given script request
     * @param {{state: number, type: string, target: string, src: string, id: string, dependencies: [string]}} request
     */
    function tryLoadScript(request) {
        // Verify that it hasn't been loaded yet, this should never happen but we may as well make sure
        if (request.state !== loadStates.READY) return;
        request.state = loadStates.LOADING;

        if (request.dependencies.length === 0) {
            // If this script has no dependencies then we can just load it straight away with no waiting
            request.promise = new Promise(function (resolve, reject) {
                // Attempt to load the script from the given source as a basic text resource so that jQuery won't execute
                // the script automatically
                $.get(request.src, function (data) {
                    // Mark the state as loaded as we have the content but we haven't done anything with it yet
                    request.state = loadStates.LOADED;

                    // Build a script wrapper. This wraps in a scope blocker meaning that two loaded scripts will not be
                    // able to communicate and allows two scripts to define the same variable without it clashing. This
                    // adds the difficulty that two scripts loaded in this way can't share values but this can be
                    // got around by assigning to the window object.
                    let script = '(function($){' + data + '})(bia.buildModifiedjQueryInstance(\'' + request.target + '\'));';
                    // Add a source mapping so the correct name is shown in the dev tools
                    script += '\n//# sourceURL=' + request.src.substr(request.src.lastIndexOf('/') + 1);
                    let scriptBlock = $('<script>').text(script);

                    $(configuration.insertion.script).append(scriptBlock);
                    request.state = loadStates.INJECTED;
                    resolve();
                }, 'text').fail(function () {
                    request.state = loadStates.FAILED;
                    reject(false);
                });
            });
            return;
        }

        let promises = [];
        for (let i = 0; i < request.dependencies.length; i++) {
            let index = getScriptLoadRequestID(request.dependencies[i]);
            if (index === undefined) {
                if (configuration.dependencies.missing === 'load') {
                    log.warn('Script request has a dependency of a file which has not been detected yet. This is ' +
                        'currently unsupported so this script cannot wait for the dependency. This dependency will ' +
                        'be ignored and the script loaded as usual. If you want to change this behaviour, update ' +
                        'the configuration "dependencies.missing" key to "skip".');
                    delete request.dependencies[i];
                } else if (configuration.dependencies.missing === 'skip') {
                    log.warn('Script request has a dependency of a file which has not been detected yet. This is ' +
                        'currently unsupported so this script cannot wait for the dependency. This script will ' +
                        'be ignored and not loaded. If you want to change this behaviour, update the configuration ' +
                        '"dependencies.missing" key to "load".');
                    request.promise = new Promise(function (resolve, reject) {
                        request.state = loadStates.FAILED;
                        reject(false);
                    });
                    return;
                }
            } else {
                request.dependencies[i] = {
                    id: request.dependencies[i],
                    index: index,
                };
                promises.push(loadRequests[index].promise);
            }
        }

        Promise.all(promises).then(function () {
            // If all the dependencies have been loaded successfully, then we clear the array and call this function
            // again which will load it normally as it doesn't have to wait on any of the scripts
            request.dependencies = [];
            request.state = loadStates.READY;
            tryLoadScript(request);
        }).catch(function () {
            if (configuration.dependencies.failed === 'load') {
                log.warn('Script request has a dependency of a file which failed to load. This dependency will ' +
                    'be ignored and the script loaded as usual. If you want to change this behaviour, update ' +
                    'the configuration "dependencies.failed" key to "skip".');
                request.dependencies = [];
                request.state = loadStates.READY;
                tryLoadScript(request);
            } else if (configuration.dependencies.failed === 'skip') {
                log.warn('Script request has a dependency of a file which failed to load. The script will not be loaded' +
                    '. If you want to change this behaviour, update the configuration "dependencies.failed" ' +
                    'key to "skip".');
                request.promise = new Promise(function (resolve, reject) {
                    request.state = loadStates.FAILED;
                    reject(false);
                });
            }
        });
    }

    /**
     * Attempts to load and insert the given style request to the document. It will set the promise of the request which
     * will resolve when the style element is injected to the body and reject if the file fails to load. The loaded css
     * will have the target ID appended to the start of each selector if the precompiled flag is false (the default).
     * @param {object} request the style request to be loaded
     */
    function tryLoadStyle(request) {
        // Verify that it hasn't been loaded yet, this should never happen but we may as well make sure
        if (request.state !== loadStates.READY) return;
        request.state = loadStates.LOADING;

        request.promise = new Promise(function (resolve, reject) {
            // Attempt to load the script from the given source as a basic text resource so that jQuery won't execute
            // the script automatically
            $.get(request.src, function (data) {
                // this is used to correct the type hinting. Assignment is actually silly and useless
                // noinspection SillyAssignmentJS
                /**
                 * @type {string}
                 */
                data = data;

                // Mark the state as loaded as we have the content but we haven't done anything with it yet
                request.state = loadStates.LOADED;

                // A load request can specify that the file has been precompiled meaning that it has already been checked
                // and each selector already only points to the region. This is designed to allow the skipping of this
                // section which could save a fractional amount of load time when using very large css files. This was
                // originally designed for use when I was using the sass compiler to perform the steps below which took
                // a significant amount of time to complete but is less relevant now. It is left in as an optimisation
                // function
                if (!request.precompiled) {
                    // This will hold the position of the closed brackets that we find in the string
                    let position = 0;
                    while ((position = data.indexOf('}', position)) !== -1) {
                        // At each close bracket that we find, we then move from the next position and keep doing all the way
                        // up until we reach a non-whitepsace character. This should be the next selector in the file. Therefore
                        // we split the string there, insert the target from the request and offset the position so we don't
                        // end up in a look and then break out as we have done what we need. We then just keep on going until
                        // we reach no more close brackets in the string
                        for (let i = position + 1; i < data.length; i++) {
                            if (!/\s/.test(data.charAt(i))) {
                                data = data.substr(0, i) + ' #' + request.target + ' ' + data.substr(i);
                                position += 4 + request.target.length;
                                break;
                            }
                        }

                        // We have to offset here because the position value to indexOf is inclusive so it would cause an
                        // infinite loop otherwise (and it did, and ended up crashing my pc...)
                        position++;
                    }

                    // Append the selector to the start of the file to apply to the first selector which wouldn't be picked
                    // up by the previous code
                    data = '#' + request.target + ' ' + data;
                }

                // Create a style element and insert it where the configuration tells us to
                let styleElement = $('<style>');
                styleElement.text(data);
                $(configuration.insertion.style).append(styleElement);

                request.state = loadStates.INJECTED;
                // Finally resolve the promise as we are all done
                resolve();
            }, 'text').fail(function () {
                request.state = loadStates.FAILED;
                reject(false);
            });
        });
    }

    /**
     * Attempts to load a region (html file) and inject it into the DOM. It will be wrapped in a hidden div by default with
     * the id specified by target. The display specified int he request will be copied to the attribute 'data-bia-display'
     * before being injected. Once injected into the page, it will then search for a 'bia-load' element and if one is found
     * it will pass it off to the load function to be executed.
     * @param {object} request a region request object
     * @return {Promise} returns a promise that resolves when the region is checked to see whether it needs to load another
     * bia load region. If so it resolves with the object that was injected, if not then it resolves with an undefined
     * value.
     */
    function tryLoadRegion(request) {
        // Verify that it hasn't been loaded yet, this should never happen but we may as well make sure
        if (request.state !== loadStates.READY) return Promise.resolve(undefined);
        request.state = loadStates.LOADING;

        return new Promise(function (oResolve) {
            request.promise = new Promise(function (resolve) {
                // Attempt to load the script from the given source as a basic text resource so that jQuery won't execute
                // the script automatically
                $.get(request.src, function (data) {
                    // this is used to correct the type hinting. Assignment is actually silly and useless
                    // noinspection SillyAssignmentJS
                    /**
                     * @type {string}
                     */
                    data = data;

                    // Mark the state as loaded as we have the content but we haven't done anything with it yet
                    request.state = loadStates.LOADED;

                    let jQueryRepresentation = $(data);

                    let requestWrapper = $('<div>').attr('id', request.target);
                    requestWrapper.css('display', 'none');
                    requestWrapper.attr('data-bia-display', request.display);
                    requestWrapper.attr('data-bia-region', true);
                    requestWrapper.append(jQueryRepresentation);

                    $(configuration.insertion.region).append(requestWrapper);
                    loadedRegions.push(request.target);

                    let loadBlocks = requestWrapper.find('bia-load');
                    if (loadBlocks.length !== 0) {
                        log.debug('Region has own load block, calling load on it', request);
                        oResolve(requestWrapper);
                    } else {
                        oResolve(undefined);
                    }

                    request.state = loadStates.INJECTED;
                    resolve();
                });
            });
        });
    }

    /**
     * Builds up a clone of the jQuery instance which is redifed such that any queries using the default selector style
     * $('selector') will be converted into $('target selector') so that it only applies to the target. This uses code
     * copied from the jQuery code to try and emulate its own functionality when recreating the new object.
     * <p>
     * If the target does not start with a # to indicate an ID, it will be prepended. The target MUST be an id of an element
     * @param {string} target the target element that the filter should be locked to
     * @return {function} the new jQuery instance which should have the exact same functionality as the jQuery instance
     */
    function buildModifiedjQueryInstance(target) {
        if (!target.startsWith('#')) target = '#' + target;

        // Copied from jQuery source code, is used to determine if a string is html
        let rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/;
        let instance = function (e, t) {
            // If the given selector is a string it means that it will either be a selector or html
            if (typeof(e) === 'string') {
                // Determine if it is html in the same way the jQuery checks for it
                let match = false;
                if (e[0] === '<' && e[e.length - 1] === '>' && e.length >= 3) match = true;
                if (!match && rquickExpr.exec(e)) match = true;

                // If it is not html then append the target to the start which will filter it down
                if (!match) {
                    e = target + ' ' + e;
                }
            }

            // Then pass it off the request to the default init which will be copied in below
            return new instance.fn.init(e, t);
        };

        // Copy all of the code form jQuery into the instance which will form a complete new jQuery instance with a custom
        // default function
        instance = Object.assign(instance, jQuery);
        // And return the new instance
        return instance;
    }

    expose('buildModifiedjQueryInstance', buildModifiedjQueryInstance);

    /**
     * Contains all of the regions that need to be loaded
     * @type {Array}
     */
    let biaRegionsToProcess = [];

    /**
     * Internal load function which performs the actual processing and loading of the element. If the element is
     * unspecified (undefined) then it will default to the body. It will find all the bia-load elements and convert it
     * to a set of load instructions via {@link buildLoadData}. These are then dispatched to the tryLoad functions. It
     * returns a promise that will resolve either when it is identified that there are no more regions to load or when
     * the region finished its own loading instruction.
     * @param {jQuery} element the element to search for 'bia-load' components within
     * @return {Promise<*>} a promise that resolves when the load function is complete
     * @private
     */
    function _load(element) {
        return new Promise(function (resolve) {
            if (element === undefined) {
                // Announce that we have begun loading as this will only be called on the first run of the load function
                events.emit('begin');

                element = $('body');
            }
            // noinspection JSUnresolvedFunction
            let initialElement = element.find('bia-load');
            biaRegionsToProcess = biaRegionsToProcess.concat(initialElement);

            if (initialElement.length === 0) {
                return;
            }

            // Determine if this load will attempt to load any regions. If we need it, it means that there is a chance
            // that the load function could be called again. If that happens, we need to wait until that happens (or
            // does't before we can resolve the promise. However, if that is never happening we can resolve straight away)
            let containsRegion = false;
            for (let i = 0; i < biaRegionsToProcess.length; i++) {
                if (biaRegionsToProcess[i].find('load[type="region"]').length !== 0) {
                    containsRegion = true;
                    break;
                }
            }
            if (!containsRegion) resolve();

            for (let j = 0; j < biaRegionsToProcess.length; j++) {
                let biaElement = biaRegionsToProcess.pop();

                loadRequests = loadRequests.concat(buildLoadData(biaElement));
                log.debug('Initial list of resources to load', loadRequests);

                for (let i = 0; i < loadRequests.length; i++) {
                    let request = loadRequests[i];

                    // If the script is not ready it means it has been loaded before so we need to skip it
                    if (request.state !== loadStates.READY) continue;

                    if (request.type === 'script') {
                        // noinspection JSCheckFunctionSignatures
                        tryLoadScript(request);
                    }

                    if (request.type === 'style') {
                        tryLoadStyle(request);
                    }

                    if (request.type === 'region') {
                        tryLoadRegion(request).then(function (value) {
                            if (value !== undefined) _load(value).then(resolve);
                            else resolve();
                        });
                    }
                }

                biaElement.remove();
            }
        });
    }

    /**
     * The real load function. It calls the internal load function which will default to loading from the body. When all
     * of the load instructions have completed, it will emit the 'done' event and depending on how the loading went, will
     * emit one of 'success', 'partial' or 'fail'.
     */
    function load() {
        _load(undefined).then(function () {
            return Promise.all(loadRequests.map(function (element) {
                return element.hasOwnProperty('promise') ? element.promise : undefined;
            }).filter(function (element) {
                return element !== undefined;
            })).then(function () {
                events.emit('success');
            }).catch(function () {
                let hasSuccess = false;
                for (let i = 0; i < loadRequests.length && !hasSuccess; i++) {
                    if (loadRequests[i].state === loadStates.INJECTED) hasSuccess = true;
                }
                if (hasSuccess) {
                    events.emit('partial');
                } else {
                    events.emit('fail');
                }
            }).finally(function () {
                events.emit('done');
            });
        });
    }

    expose('load', load);
})();
