// Bolt Inspector - Click-to-Source Navigation
// This module enables design mode and click-to-source navigation
// Design mode works in both dev and production
// Click-to-source only works in React development mode (when _debugSource is available)

if (typeof window !== 'undefined') {
  console.log('[Bolt Inspector] Initializing');
  console.log('[Bolt Inspector] Environment:', {
    nodeEnv: typeof process !== 'undefined' ? process.env?.NODE_ENV : 'unknown',
    isDev: typeof import.meta !== 'undefined' ? import.meta.env?.DEV : 'unknown'
  });

  /**
   * Extract React Fiber from DOM element
   */
  function getReactFiber(element) {
    if (!element || typeof element !== 'object') return null;
    
    // React attaches fiber to DOM nodes with keys like __reactFiber$xxxxx
    const fiberKey = Object.keys(element).find(key => 
      key.startsWith('__reactFiber$')
    );
    
    return fiberKey ? element[fiberKey] : null;
  }

  /**
   * Walk up the fiber tree to find _debugSource
   */
  function findDebugSource(fiber) {
    let current = fiber;
    let depth = 0;
    const maxDepth = 50; // Prevent infinite loops
    
    while (current && depth < maxDepth) {
      // Check if this fiber has debug source information
      if (current._debugSource) {
        return current._debugSource;
      }
      
      // Walk up to parent fiber
      current = current.return;
      depth++;
    }
    
    return null;
  }

  /**
   * Handle click events on React components
   * Only active when inspect mode is enabled
   */
  function handleClick(event) {
    // Check if inspect mode is enabled (controlled by parent)
    if (!window.__BOLT_INSPECT_MODE_ENABLED__) {
      return; // Let clicks work normally
    }
    
    // Don't navigate to code if design mode is active
    if (window.__BOLT_DESIGN_MODE_ENABLED__) {
      return; // Design mode takes priority
    }

    try {
      const element = event.target;
      
      // Get React Fiber from the clicked element
      const fiber = getReactFiber(element);
      
      if (!fiber) {
        console.log('[Bolt Inspector] No React Fiber found on element:', element);
        return;
      }
      
      console.log('[Bolt Inspector] Found fiber:', fiber.type?.name || fiber.elementType?.name || 'unknown');
      
      // Find debug source in fiber tree
      const debugSource = findDebugSource(fiber);
      
      if (!debugSource) {
        console.log('[Bolt Inspector] No _debugSource found in fiber tree. React might be in production mode or source maps disabled.');
        return;
      }
      
      const { fileName, lineNumber } = debugSource;
      
      if (!fileName || !lineNumber) {
        console.log('[Bolt Inspector] Debug source found but missing fileName or lineNumber:', debugSource);
        return;
      }
      
      console.log('[Bolt Inspector] Component clicked:', { fileName, lineNumber });
      
      // Send message to parent window (editor)
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'BOLT_NAVIGATE_TO_SOURCE',
          payload: {
            file: fileName,
            line: lineNumber
          }
        }, '*');
      }
      
      // Prevent default action when in inspect mode
      event.preventDefault();
      event.stopPropagation();
      
    } catch (err) {
      // Fail silently - don't break user's app
      console.debug('[Bolt Inspector] Error:', err);
    }
  }

  // Initialize inspect mode state
  window.__BOLT_INSPECT_MODE_ENABLED__ = false;
  
  // Initialize design mode state
  window.__BOLT_DESIGN_MODE_ENABLED__ = false;
  window.__BOLT_HOVERED_ELEMENT__ = null;
  window.__BOLT_SELECTED_ELEMENT__ = null;
  window.__BOLT_ORIGINAL_STYLES__ = '';

  /**
   * Get component name from React Fiber
   */
  function getComponentName(fiber) {
    if (!fiber) return 'Unknown';
    
    if (fiber.type?.name) return fiber.type.name;
    if (fiber.type?.displayName) return fiber.type.displayName;
    if (fiber.elementType?.name) return fiber.elementType.name;
    if (typeof fiber.type === 'string') return fiber.type;
    
    return 'Anonymous';
  }

  /**
   * Extract comprehensive styles from element
   */
  function extractElementStyles(element, fiber) {
    const computed = window.getComputedStyle(element);
    const props = fiber?.memoizedProps || {};
    
    return {
      // Source
      className: props.className || '',
      inlineStyle: props.style || {},
      
      // Computed values
      spacing: {
        marginTop: computed.marginTop,
        marginRight: computed.marginRight,
        marginBottom: computed.marginBottom,
        marginLeft: computed.marginLeft,
        paddingTop: computed.paddingTop,
        paddingRight: computed.paddingRight,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
      },
      typography: {
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        fontFamily: computed.fontFamily,
        lineHeight: computed.lineHeight,
        textAlign: computed.textAlign,
        color: computed.color,
        letterSpacing: computed.letterSpacing,
        textTransform: computed.textTransform,
      },
      layout: {
        display: computed.display,
        width: computed.width,
        height: computed.height,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        gap: computed.gap,
        position: computed.position,
      },
      appearance: {
        backgroundColor: computed.backgroundColor,
        borderWidth: computed.borderWidth,
        borderStyle: computed.borderStyle,
        borderColor: computed.borderColor,
        borderRadius: computed.borderRadius,
        opacity: computed.opacity,
        boxShadow: computed.boxShadow,
      }
    };
  }

  /**
   * Handle mouseover for design mode
   */
  function handleMouseOver(event) {
    if (!window.__BOLT_DESIGN_MODE_ENABLED__) return;
    
    const element = event.target;
    window.__BOLT_HOVERED_ELEMENT__ = element;
    
    // Add highlight
    element.style.outline = '2px solid #3b82f6';
    element.style.outlineOffset = '2px';
  }

  /**
   * Handle mouseout for design mode
   */
  function handleMouseOut(event) {
    if (!window.__BOLT_DESIGN_MODE_ENABLED__) return;
    
    const element = event.target;
    
    // Remove highlight
    element.style.outline = '';
    element.style.outlineOffset = '';
    
    if (window.__BOLT_HOVERED_ELEMENT__ === element) {
      window.__BOLT_HOVERED_ELEMENT__ = null;
    }
  }

  /**
   * Handle click for design mode
   */
  function handleClickDesignMode(event) {
    // IMPORTANT: Check if design mode is enabled FIRST before preventing default
    if (!window.__BOLT_DESIGN_MODE_ENABLED__) return;
    
    // Design mode is ON - prevent inspect mode from running
    // Stop propagation in capture phase to prevent inspect mode handler
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation(); // This prevents other listeners on the same element
    
    const element = event.target;
    const fiber = getReactFiber(element);
    
    if (!fiber) {
      console.log('[Design Mode] No React Fiber found');
      return;
    }
    
    // Store element reference and original styles for later updates
    window.__BOLT_SELECTED_ELEMENT__ = element;
    window.__BOLT_ORIGINAL_STYLES__ = element.style.cssText;
    
    const debugSource = findDebugSource(fiber);
    const styles = extractElementStyles(element, fiber);
    const componentName = getComponentName(fiber);
    
    console.log('[Design Mode] Element selected:', componentName, styles);
    
    // Send to parent
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'BOLT_ELEMENT_SELECTED',
        payload: {
          componentName,
          elementType: element.tagName.toLowerCase(),
          file: debugSource?.fileName,
          line: debugSource?.lineNumber,
          styles,
        }
      }, '*');
    }
  }

  // IMPORTANT: Add design mode listener BEFORE inspect mode listener
  // This ensures design mode gets priority in capture phase
  document.addEventListener('click', handleClickDesignMode, true);
  
  // Add click listener in capture phase
  // This allows us to intercept clicks before they reach the app
  // But we only preventDefault when inspect mode is ON
  document.addEventListener('click', handleClick, true);
  
  // Add design mode event listeners
  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mouseout', handleMouseOut, true);

  // Listen for inspect mode toggle from parent
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TOGGLE_INSPECT_MODE') {
      window.__BOLT_INSPECT_MODE_ENABLED__ = event.data.enabled;
      console.log('[Bolt Inspector] Inspect mode:', event.data.enabled ? 'ON' : 'OFF');
      
      // Change cursor to indicate inspect mode
      if (event.data.enabled) {
        document.body.style.cursor = 'crosshair';
      } else {
        document.body.style.cursor = '';
      }
    }
    
    // Listen for design mode toggle
    if (event.data && event.data.type === 'TOGGLE_DESIGN_MODE') {
      window.__BOLT_DESIGN_MODE_ENABLED__ = event.data.enabled;
      console.log('[Design Mode]:', event.data.enabled ? 'ON' : 'OFF');
      
      // Change cursor to indicate design mode
      if (event.data.enabled) {
        document.body.style.cursor = 'pointer';
      } else {
        document.body.style.cursor = '';
        
        // Clear any existing highlights
        if (window.__BOLT_HOVERED_ELEMENT__) {
          window.__BOLT_HOVERED_ELEMENT__.style.outline = '';
          window.__BOLT_HOVERED_ELEMENT__.style.outlineOffset = '';
        }
      }
    }
    
    // Listen for real-time style updates
    if (event.data && event.data.type === 'UPDATE_ELEMENT_STYLE') {
      const { property, value } = event.data.payload;
      const element = window.__BOLT_SELECTED_ELEMENT__;
      
      if (element) {
        // Apply temporary inline style
        element.style[property] = value;
        console.log('[Design Mode] Style updated:', property, '=', value);
      }
    }
    
    // Listen for style revert
    if (event.data && event.data.type === 'REVERT_ELEMENT_STYLES') {
      const element = window.__BOLT_SELECTED_ELEMENT__;
      
      if (element) {
        // Restore original styles
        element.style.cssText = window.__BOLT_ORIGINAL_STYLES__;
        console.log('[Design Mode] Styles reverted');
      }
    }
  });

  console.log('[Bolt Inspector] Click listener attached');
  console.log('[Design Mode] Event listeners attached');
}
