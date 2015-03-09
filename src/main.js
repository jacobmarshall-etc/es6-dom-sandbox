import 'babelify/polyfill';

import $ from './DOM';

let $document = $(document.documentElement);

let foo = $('.foo');

const getPositionCSS = ($element, x, y) => {
    let type = $element.attr('data-type');

    return type === 'position' ? { top: y + 'px', left: x + 'px' } :
           type === 'transform' ? { transform: 'translate3d(' + x + 'px, ' + y + 'px, 0)' } : undefined;
};

const trackMouse = ($target, offsetX, offsetY) => (event) => {
    let x = event.pageX - offsetX, y = event.pageY - offsetY;

    $target.css(getPositionCSS($target, x, y));
};

let zIndex = 0;

foo
    .addClass('bar')
    .on('mousedown', event => {
        event.preventDefault();

        let $target = $(event.target).addClass('active'),
            track = trackMouse($target, event.offsetX, event.offsetY);

        $document.on('mousemove', track);
        $document.on('mouseup', event => {
            $target.removeClass('active');
            $document.off('mousemove', track);
        });

        $target.css('zIndex', ++zIndex);
    })
    .on('dblclick', event => {
        let $target = $(event.target);

        $target.css(getPositionCSS($target, 0, 0));

        setTimeout(() => $target.remove(), 1e3);
    });
