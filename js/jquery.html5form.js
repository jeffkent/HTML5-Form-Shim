/*
* HTML5 Form Shim
*
* @package HTML5 Form Shim
* @author $Author: sheiko $
* @version $Id: jquery.html5form.js, v 0.9 $
* @license GNU
* @copyright (c) Dmitry Sheiko http://www.dsheiko.com
*/
(function( $ ) {

    var ONINPUT_DELAY = 500,
    Util = {
        isString :  function(value) {
            return typeof(value)=='string' && isNaN(value);
        },
        isNumber :  function(value) {
            return !isNaN(parseFloat(value)) && isFinite(value);
        },
        log : function(val) {
            var placeholder = $('.log');
            if (placeholder.length) {
                placeholder.html(placeholder.html() + val + '<br />');
            }
        }
    },
    Browser = {
        /**
         *  List of supported types of input element
         *  Run through HTML5's new input types to see if the UA understands any.
         *  Implementation adopted from http://www.modernizr.com
         */
        supportedInputTypes: (function() {
            var inputElem = document.createElement('input'),
            types = (function(props) {
            for ( var i = 0, types =[], len = props.length; i < len; i++ ) {
                inputElem.setAttribute('type', props[i]);
                types[props[i]] = !!(inputElem.type !== 'text');
            }
            return types;
            })('search tel url email datetime date month week time datetime-local number range color'.split(' '));
          return types;
        }()),
        /*
         * List of supported properties of input element
         * Run through HTML5's new input attributes to see if the UA understands any.
         * Implementation adopted from http://www.modernizr.com
         *  spec: http://www.whatwg.org/specs/web-apps/current-work/multipage/the-input-element.html#input-type-attr-summary
         */
        supportedInputProps: (function() {
            var inputElem = document.createElement('input'),
                attrs = (function( props ) {
                    for ( var i = 0, attrs = [], len = props.length; i < len; i++ ) {
                        attrs[ props[i] ] = !!(props[i] in inputElem);
                    }
                    return attrs;
                })('autocomplete autofocus list placeholder max min multiple pattern required step'
                    .split(' '));
            return attrs;
        }())
    },
    App = {
        init: function() {
            $("form").each(function(){
                var _form = new App.Form($(this));
                _form.init();
            });
        },
        Form : function(form) {
            var _private = {
                form : form,
                elements: [],
                handleOnSubmit : function(e) {
                   e.preventDefault();
                   var context = e.data;
                   if (!context.isCustomValidation() && context.isNoValidate()) {
                       return;
                   }
                   for(var i in _private.elements) {
                       var element = _private.elements[i];
                       if ((typeof element.element.attr('required') !== 'undefined') &&
                           (element.element.val() === element.element.attr('placeholder')
                           || !element.element.val())) {
                           element.showTooltip("Please fill out this field");
                           return;
                       }
                       if (!element.validity.valid()) {
                           element.showTooltip();
                           return;
                       }
                   }
               },
               normalizeName : function(str) {
                   str += '';
                   return str.charAt(0).toUpperCase() + (str.substr(1).toLowerCase());
               }
            };
            return {
               isCustomValidation: function() { return (typeof _private.form.attr('custom-validation') !== "undefined"); },
               isNoValidate: function() { return (typeof _private.form.attr('novalidate') !== "undefined"); },

               init : function() {
                   var context = this;
                   if (this.isCustomValidation()) {
                       _private.form.attr("novalidate", "novalidate");
                   }
                    _private.form.find("input, textarea").each(function(){
                        var instance = context.makeElementInstance($(this));
                        if (instance !== false) {
                            _private.elements.push(instance);
                        }
                    });
                    _private.form.bind('submit', this, _private.handleOnSubmit);
               },
               makeElementInstance : function(element) {
                   var instance = {}, textAliases = {
                       "Password": true, "Tel": true, "Search": true
                   },
                   type = _private.normalizeName(element.attr('type'));
                   type = (typeof textAliases[type] !== "undefined" ? "Text" : type);
                   if (typeof App[type] === "undefined") {
                       return false;
                   }
                   $.extend(true, instance, new App[type]);
                   $.extend(true, instance, App.Element_Abstract);
                   instance.process(element);
                   return instance;
               }
            }
        },
        Element_Abstract: {
            element : null,
            hasPlaceholder: false,
            _delayedRequest: null,
            _validityProps: "valueMissing typeMismatch patternMismatch rangeUnderflow rangeOverflow customError".split(" "),
            validationMessage : {
                valueMissing : "Please fill out this field",
                typeMismatch : "",
                patternMismatch : "The pattern is mismatched",
                rangeUnderflow: "The value is too low",
                rangeOverflow: "The value is too high",
                customError: "",
                get : function(parent) {
                    var message = "";
                    this.customError = parent.element.data('customvalidity') || "";
                    for (var i in parent._validityProps) {
                        message = parent.validity[parent._validityProps[i]]
                            ? message : this[parent._validityProps[i]];
                    }
                    return message;
                }
            },
            validity : {
                valueMissing : true,
                typeMismatch : true,
                patternMismatch : true,
                rangeUnderflow: true,
                rangeOverflow: true,
                customError: true,
                valid : function() {
                    return this.valueMissing &&
                    this.typeMismatch &&
                    this.patternMismatch &&
                    this.rangeUnderflow &&
                    this.rangeOverflow &&
                    this.customError;
                }
            },
            handleOnInput: function(e) {
                var context = e.data;
                if (null !== this._delayedRequest) {
                    window.clearTimeout(this._delayedRequest);
                }
                this._delayedRequest = window.setTimeout(function(){
                    this._delayedRequest = null;
                    context.processOninput();
                    context.checkValidity();
                    context.checkPatternValidity();
                    context.updateStatus();                    
                }, ONINPUT_DELAY);
            },
            handleOnFocus : function(e) {
                var context = (typeof e === 'undefined' ? this : e.data);
                context.element.addClass('focus');
                if (context.element.val() === context.element.attr('placeholder')) {
                    context.element.val('');
                    context.element.removeClass('placeholder');
                }

            },
            handleOnBlur : function(e) {
                var context = (typeof e === 'undefined' ? this : e.data);
                context.element.removeClass('focus');
                if (!context.element.val()) {
                    context.element.val(context.element.attr('placeholder'));
                    context.element.addClass('placeholder');
                }
            },
            isset : function(prop) {
                return (typeof this[prop] !== 'undefined');
            },
            issetAttr : function(attr) {
                return (typeof this.element.attr(attr) !== 'undefined');
            },
            process: function(element) {
                this.element = element;
                if (this.isset("init")) {
                    this.init();
                }
                if (!Browser.supportedInputProps.placeholder) {
                    this.processPlaceholder();
                    this.element.bind('focusin', this, this.handleOnFocus);
                    this.element.bind('focusout', this, this.handleOnBlur);
                }
                if (!Browser.supportedInputProps.required) {
                    this.processRequired();
                }
                if (!Browser.supportedInputProps.autofocus) {
                    this.processAutofocus();
                }
                if (!Browser.supportedInputProps[this.element.attr('type')]) {
                    this.syncElementUI();
                }
            },
            syncElementUI: function() {
                this.element.bind('change', this, this.handleOnInput);
                this.element.bind('mouseup', this, this.handleOnInput);
                this.element.bind('keydown', this, this.handleOnInput);
                // @TODO: Context menu handling: this.element.get().oncontextmenu =  _private.handleOnInput;

            },
            processRequired: function() {
                if (typeof this.element.attr('required') !== 'undefined') {
                    this.element.addClass('required');
                }
            },
            processAutofocus: function() {
                if (this.issetAttr("autofocus")) {
                    this.element.focus();
                    this.handleOnFocus();
                }
            },
            processPlaceholder: function() {
                if (this.issetAttr("placeholder")) {
                    this.element.attr("autocomplete", "false");
                    this.hasPlaceholder = true;
                    this.handleOnBlur();
                }
            },
            processOninput: function() {
                if (this.issetAttr("oninput")) {
                    var callbackKey = this.element.attr("oninput"), pos = callbackKey.indexOf("(");
                    callbackKey = pos ? callbackKey.substr(0, pos) : callbackKey;
                    if (typeof window[callbackKey]) {                        
                        window[callbackKey](this.element);                                                
                        this.validity.customError = !(this.element.data('customvalidity')
                            && this.element.data('customvalidity').length);
                    }
                }
            },
            checkPatternValidity: function() {
                if (!this.element.attr('pattern')) {
                    return true;
                }
                if (this.element.attr('title')) {
                    this.validationMessage.patternMismatch = this.element.attr('title');
                }
                var pattern = new RegExp(this.element.attr('pattern'), 'g');
                this.validity.patternMismatch = pattern.test(this.element.val());
            },
            updateStatus: function() {
                this.element.removeClass('valid').removeClass('invalid');
                this.element.addClass(this.validity.valid() ? 'valid' : 'invalid');
            },
            showTooltip : function(error) {
               if (!error) {
                    error = this.validationMessage.get(this);
               }
               $.setCustomValidityCallback.apply(this.element, [error]);
            }
        },
        Email: function() {
            return {
                init: function() {
                    this.validationMessage.typeMismatch = "Please enter an email address";
                },
                checkValidity: function() {
                    var pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/g;
                    this.validity.typeMismatch = pattern.test(this.element.val());
                }
            }
        },
       Number: function() {
            return {
                init: function() {
                    this.validationMessage.typeMismatch = "Please enter a valid number";
                },
                checkValidity: function() {
                    this.validity.typeMismatch = Util.isNumber(this.element.val());
                    this.validity.rangeUnderflow = !(this.issetAttr('min')
                        && parseInt(this.element.val()) < parseInt(this.element.attr('min')));
                    this.validity.rangeOverflow = !(this.issetAttr('max')
                        && parseInt(this.element.val()) > parseInt(this.element.attr('max')));

                    return true;
                }
            }
       },
       Url: function() {
            return {
                init: function() {
                    this.validationMessage.typeMismatch = "Please enter a valid URL";
                },
                checkValidity: function() {
                    //The pattern is taken from http://stackoverflow.com/questions/2838404/javascript-regex-url-matching
                    var pattern = new RegExp('^(https?:\/\/)?'+ // protocol
                        '((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|'+ // domain name
                        '((\d{1,3}\.){3}\d{1,3}))'+ // OR ip (v4) address
                        '(\:\d+)?(\/[-a-z\d%_.~+]*)*'+ // port and path
                        '(\?[;&a-z\d%_.~+=-]*)?'+ // query string
                        '(\#[-a-z\d_]*)?$','i'); // fragment locater
                    this.validity.typeMismatch = pattern.test(this.element.val());
                }
            }
        },
        Text: function() {
            return {
                checkValidity: function() {                    
                }
            }
        }
    };

    /**
     * Renders tooltip when validation error happens on form submition
     * Can be overriden 
     */
    $.setCustomValidityCallback = function(error) {
       var pos = this.position(),
       tooltip = $('<span class="custom-validity-tooltip">' + error
                   + '<div><div><!-- --></div></div></span>').appendTo('body');
       tooltip.css('top', pos.top - tooltip.height() - 22);
       tooltip.css('left', pos.left - 10);
       window.setTimeout(function(){
            tooltip.remove();
       }, 2500);
    }
    /**
     * Shim for setCustomValidity DOM element method
     */
    $.fn.setCustomValidity = function(error) {        
        this.each(function() {
            if (typeof $(this).get(0).setCustomValidity === 'function') {
                $(this).get(0).setCustomValidity(error);
            }            
            $(this).data('customvalidity', error);            
        });
    }
// Document is ready
$(document).bind('ready.html5formshim', App.init);


})( jQuery );

