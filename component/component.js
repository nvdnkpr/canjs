steal("can/util","can/control","can/observe","can/view/mustache","can/view/mustache/bindings",function(can){
	
	var Component = can.Component = can.Construct.extend({
		setup: function(){
			can.Construct.setup.apply( this, arguments );
			
			if(can.Component){
				var self = this;
				this.Control = can.Control.extend(can.extend({
					init: function(el, options){
						this.scope = options.scope;
					}
				},this.prototype.events));
				
				var attributeScopeMappings = {};
				// go through scope and get attribute ones
				can.each(this.prototype.scope, function(val, prop){
					if(val === "@") {
						attributeScopeMappings[prop] = prop;
					}
				}) 
				this.attributeScopeMappings = attributeScopeMappings;
				
				this.Map = can.Map.extend(this.prototype.scope);
				if(this.prototype.template){
					this.renderer = typeof this.prototype.template == "function" ?
						this.prototype.template : can.view.mustache( this.prototype.template );
				}
				
				
				
				can.view.Scanner.tag(this.prototype.tag,function(el, options){
					new self(el, options)
				});
			}
			
		}
	},{
		setup: function(el, hookupOptions){
			// Setup values passed to component
			var initalScopeData = {},
				component = this;
			
			// scope prototype properties marked with an "@" are added here
			can.each(this.constructor.attributeScopeMappings,function(val, prop){
				initalScopeData[prop] = el.getAttribute(val)
			})
			
			// get the value in the scope for each attribute
			can.each(can.makeArray(el.attributes), function(node, index){
				
				var name = node.nodeName.toLowerCase();
				
				// ignore attributes already in ScopeMappings
				if(component.constructor.attributeScopeMappings[name] || name === "data-view-id"){
					return;
				}
				
				// get the value from the current scope
				initalScopeData[name] = hookupOptions.scope.attr(name);
				
				// if this is something that we can auto-update, lets do that
				var compute = hookupOptions.scope.compute(name),
					handler = function(ev, newVal){
						componentScope.attr(name, newVal)
					}
				// compute only returned if bindable
				if(compute){
					compute.bind("change", handler);
					can.bind.call(el,"removed",function(){
						compute.unbind("change", handler);
					})
				}
			})
			
			// save the scope
			var componentScope = this.scope = new this.constructor.Map(initalScopeData);
			$(el).data("scope", this.scope)
			
			// create a real Scope object out of the scope property
			var renderedScope = hookupOptions.scope.add( this.scope ),
			
				// setup helpers to callback with `this` as the component
				helpers = this.helpers || {};
			can.each(helpers, function(val, prop){
				if(can.isFunction(val)) {
					helpers[prop] = function(){
						return val.apply(componentScope, arguments)
					}
				}
			});
			
			// create a control to listen to events
			this._control = new this.constructor.Control(el, {scope: this.scope});
			
			// if this component has a template (that we've already converted to a renderer)
			if( this.constructor.renderer ) {
				// add content to tags
				if(!helpers._tags){
					helpers._tags = {};
				}
				
				// we need be alerted to when a <content> element is rendered so we can put the original contents of the widget in its place
				helpers._tags.content = function(el, rendererOptions){
					
					// if there was html within the original element
					if(hookupOptions.subtemplate){
						// render it with this component's scope and helpers
						var subtemplate = can.view.frag( hookupOptions.subtemplate(renderedScope, rendererOptions.options.add(helpers) ) );
						// swap out its html
						$(el).replaceWith(subtemplate)
					} else {
						// if there was nothing within the original element, use template within <content> as a default
						return rendererOptions.scope;
					}
				}
				// render the component's template
				var frag = this.constructor.renderer( renderedScope, helpers);
			} else {
				// otherwise render the contents between the 
				var frag = can.view.frag( hookupOptions.subtemplate(renderedScope, hookupOptions.options.add(helpers)) );
			}
			$(el).html(  frag )
		}
	})
	
	
	$.fn.scope = function(attr){
		if( attr ) {
			return this.data("scope").attr(attr)
		} else {
			return this.data("scope")
		}
	}
	
	return Component;
	
})