let $, $document;

/**
 * Parses values out of a string, delimited by spaces.
 *
 * @param {String} str
 * @return {Array}
 */
const parseSpaces = str => str.trim().split(/\s+/);

/**
 * Formats camel case CSS rules to hyphenated lower case.
 *
 * @param {String} str
 * @return {String}
 */
const formatCssRule = str => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * The internal data store for elements.
 *
 * @type {WeakMap}
 */
const privateData = new WeakMap();

/**
 * Parses html text into proper html elements.
 *
 * @param {String} html
 * @returns {DOM}
 */
const toElement = html => {
    let parser = new DOMParser(),
        doc = parser.parseFromString(html, 'text/html'),
        children = Array.from(doc.body.childNodes);

    // Detach all the children from the document & create collection
    return $(children).detach();
};

/**
 * Whether or not to allow the `element` into a DOM collection.
 *
 * @param {*} element
 * @returns {Boolean}
 */
const isElement = element => {
    return element instanceof HTMLDocument ||
         ((element instanceof Node || element instanceof HTMLElement) &&
          (element.nodeType === 3 || element.nodeType === 1));
};

/**
 * Symbol used to `private` the element clean up method.
 *
 * @type Symbol
 */
const cleanUp = Symbol('#cleanUp');

class DOM extends Array {
    /**
     * Construct a new DOM collection, and pass the initialisation variables
     * to the #init method to be processed.
     */
    constructor(...args) {
        this.init(...args);
    }

    /**
     * Initialise the DOM collection.
     *
     * @param {String|HTMLElement[]|HTMLElement|HTMLDocument|undefined}     selector
     * @param {String|HTMLElement[]|HTMLElement|HTMLDocument|DOM|undefined} parent
     */
    init(selector, parent) {
        this.selector = selector || '';
        this.parent = parent ? $(parent) : $document;

        if (typeof selector === 'string' && this.parent) {
            this.parent.find(selector).each(element => this.add(element));
        }

        else {
            this.add(selector); // HTMLElement|HTMLElement[]|HTMLDocument|undefined
        }
    }

    /**
     * Returns a new DOM collection, containing matching elements.
     *
     * @param {String} selector
     * @returns {DOM}
     */
    find(selector) {
        let collection = $();

        this.each(element => {
            let elements = element.querySelectorAll(selector);

            collection.add(Array.from(elements));
        });

        return collection;
    }

    /**
     * Adds an element to the DOM collection.
     *
     * @param {HTMLElement|HTMLElement[]|HTMLDocument|DOM} element
     * @returns {DOM}
     */
    add(element) {
        if (isElement(element)) {
            this.push(element);
        }

        else if (Array.isArray(element)) {
            element.forEach(_element => this.add(_element));
        }

        else if (element instanceof DOM) {
            element.each(_element => this.add(_element));
        }

        return this;
    }

    /**
     * Gets an element by the index id.
     *
     * @param {Number} index
     * @returns {HTMLElement|HTMLDocument|undefined}
     */
    get(index) {
        if (index > this.length) return undefined;

        return this[index];
    }

    /**
     * Iterates over each item in the DOM collection.
     *
     * @param {Function} callback
     * @returns {DOM}
     */
    each(callback) {
        if (typeof callback === 'function') {
            this.forEach((element, index) => callback.call(element, element, index));
        }

        return this;
    }

    /**
     * Adds a/many classes to all items in the DOM collection.
     *
     * @param {String} classes
     * @returns {DOM}
     */
    addClass(classes) {
        let _classes = parseSpaces(classes);

        this.each(element => {
            _classes.forEach(_class => element.classList.add(_class));
        });

        return this;
    }

    /**
     * Removes a/many classes from all items in the DOM collection.
     *
     * @param {String} classes
     * @returns {DOM}
     */
    removeClass(classes) {
        let _classes = parseSpaces(classes);

        this.each(element => {
            _classes.forEach(_class => element.classList.remove(_class));
        });

        return this;
    }

    /**
     * Registers an event listener on all items in the DOM collection.
     *
     * @param {String} events
     * @param {Function} callback
     * @returns {DOM}
     */
    on(events, callback) {
        if (typeof callback !== 'function' || !events) {
            return this;
        }

        let _events = parseSpaces(events);

        this.each(element => {
            _events.forEach(_event => element.addEventListener(_event, callback, false));
        });

        return this;
    }

    /**
     * De-registers an event listener on all items in the DOM collection.
     *
     * @param {String} events
     * @param {Function} callback
     * @returns {DOM}
     */
    off(events, callback) {
        if (typeof callback !== 'function' || !events) {
            return this;
        }

        let _events = parseSpaces(events);

        this.each(element => {
            _events.forEach(_event => element.removeEventListener(_event, callback, false));
        });

        return this;
    }

    /**
     * Removes all the items in the DOM collection from their parents.
     *
     * @return {DOM}
     */
    detach() {
        this.each(element => {
            if (element.parentElement) {
                element.parentElement.removeChild(element);
            }
        });

        return this;
    }

    /**
     * Sets a/multiple css rules to all the items in the DOM collection.
     *
     * @param {Object|String} rule
     * @param {*} value
     * @returns {DOM}
     */
    css(rule, value) {
        if (typeof value === 'undefined' && rule) {
            Object.keys(rule).forEach(_rule => {
                this.css(_rule, rule[_rule]);
            });
        }

        else {
            this.each(element => element.style[rule] = value);
        }

        return this;
    }

    /**
     * Gets/sets element attributes.
     *
     * @param {String} key
     * @param {String} value
     * @returns {*}
     */
    attr(key, value) {
        if (typeof value === 'undefined') {
            // Only allow this operation if there is just one item in the collection
            if (this.length !== 1) return undefined;

            let element = this.get(0);

            // Attempt at getting the element's attribute
            return element.getAttribute(key);
        }

        else {
            this.each(element => element.setAttribute(key, value));
        }
    }

    /**
     * Sets and gets data from within the private data store.
     *
     * Allows storing data against elements that is not only a string.
     *
     * @param {String} [key]
     * @param {*} [value]
     * @returns {DOM|Object|undefined|*}
     */
    data(key, value) {
        if (typeof value === 'undefined') {
            // Only allow this operation if there is one element in the collection
            if (this.length !== 1) return undefined;

            let element = this.get(0);

            // Lazy initiate the element's private data store
            if (!privateData.has(element)) {
                privateData.set(element, Object.create(null));
            }

            let data = privateData.get(element);

            if (typeof key !== 'undefined') {
                return data[key];
            }

            return data;
        }

        else {
            this.each(element => {
                let data = $(element).data();

                data[key] = value;
            });
        }

        return this;
    }

    /**
     * Clones all the elements in the DOM collection, and returns a new DOM collection
     * containing them.
     *
     * @returns {DOM}
     */
    clone() {
        let collection = $();

        this.each(element => collection.add(element.cloneNode(true)));

        return collection;
    }

    /**
     * Append html/other elements to another element/elements.
     *
     * If the `html` argument is a string, each element in the DOM collection
     * will be appended with a clone of the html.
     *
     * If the `html` argument is anything else (ie. another element), the first
     * element in the DOM collection will be appended with the element. This will
     * detach whatever is in the `html` argument from their parent(s).
     *
     * @param {String|HTMLElement|DOM} html
     * @returns {DOM}
     */
    append(html) {
        let element;

        if (typeof html === 'string') {
            element = this;
            html = toElement(html);
        }

        else if (!html instanceof DOM) {
            element = $(this.get(0));
            html = $(html);
        }

        element.each(_element => {
            let append = html;

            if (element.length > 1) {
                append = append.clone();
            }

            append.each(_append => {
                _element.appendChild(_append);
            });
        });

        return this;
    }

    /**
     * Removes the items in the DOM collection, and all their children.
     *
     * @returns {DOM}
     */
    remove() {
        let children = this.find('*');

        if (children.length) {
            children.remove();
        }

        // Detach and clean up (internal memory collection)
        this.detach();
        this[cleanUp]();

        // Actually delete/remove the element(s)
        this.each(element => element.remove());

        // Remove the elements from the DOM collection
        this.length = 0;

        return this;
    }

    /**
     * Cleans up any internal data attached to the items in the DOM collection.
     * This method is private, and is only ever invoked when removing the item(s).
     *
     * @private
     */
    [cleanUp]() {
        this.each(element => privateData.delete(element));
    }
}

/**
 * Selects elements from the dom, or within another element, and places the
 * items into a DOM collection.
 *
 * @param {String|HTMLElement[]|HTMLElement|HTMLDocument|undefined}     selector
 * @param {String|HTMLElement[]|HTMLElement|HTMLDocument|DOM|undefined} parent
 * @returns {DOM}
 */
$ = (selector, parent = $document) => {
    if (selector instanceof DOM) return selector;

    return new DOM(selector, parent);
};

// Define the default parent element (current document)
$document = $(document);

export default $;
