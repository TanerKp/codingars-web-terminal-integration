export function modalViewElement() {
    // Modal Container erstellen
    const modalContainer = document.createElement('div');
    modalContainer.classList.add('coding-ars-modal-container');
    modalContainer.style.display = 'none';
    
    // Modal Content Wrapper
    const modalContent = document.createElement('div');
    modalContent.classList.add('coding-ars-modal-content');
    
    // Schließen-Button
    const closeButton = document.createElement('span');
    closeButton.classList.add('coding-ars-modal-close');
    closeButton.innerHTML = '&times;';
    
    // Header-Bereich
    const modalHeader = document.createElement('div');
    modalHeader.classList.add('coding-ars-modal-header');
    
    const modalTitle = document.createElement('div');
    modalTitle.classList.add('coding-ars-modal-title');
    modalHeader.appendChild(modalTitle);
    
    // Body-Bereich
    const modalBody = document.createElement('div');
    modalBody.classList.add('coding-ars-modal-body');
    
    // Footer-Bereich
    const modalFooter = document.createElement('div');
    modalFooter.classList.add('coding-ars-modal-footer');
    
    // Content zusammensetzen
    modalHeader.appendChild(closeButton);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modalContainer.appendChild(modalContent);
    
    // Overlay für Hintergrund-Dimming
    const modalOverlay = document.createElement('div');
    modalOverlay.classList.add('coding-ars-modal-overlay');
    modalContainer.appendChild(modalOverlay);
    
    // Event-Listener für Schließen
    closeButton.addEventListener('click', () => {
        modalContainer.controller.close();
    });
    
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            modalContainer.controller.close();
        }
    });
    
    // ESC-Taste zum Schließen
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modalContainer.style.display !== 'none') {
            modalContainer.controller.close();
        }
    });
    
    // Controller für das Modal
    modalContainer.controller = {
        open: (options = {}) => {
            // Optionen verarbeiten
            if (options.title) {
                modalTitle.textContent = options.title;
            }
            
            if (options.content) {
                if (typeof options.content === 'string') {
                    modalBody.innerHTML = options.content;
                } else if (options.content instanceof HTMLElement) {
                    modalBody.innerHTML = '';
                    modalBody.appendChild(options.content);
                }
            }
            
            // Footer-Buttons löschen und ggf. neue erstellen
            modalFooter.innerHTML = '';
            
            if (options.buttons && Array.isArray(options.buttons)) {
                options.buttons.forEach(btnConfig => {
                    const button = document.createElement('button');
                    button.classList.add('coding-ars-modal-button');
                    
                    if (btnConfig.className) {
                        button.classList.add(btnConfig.className);
                    }
                    
                    button.textContent = btnConfig.text || 'Button';
                    
                    if (btnConfig.onClick && typeof btnConfig.onClick === 'function') {
                        button.addEventListener('click', (e) => {
                            btnConfig.onClick(e, modalContainer.controller);
                        });
                    }
                    
                    modalFooter.appendChild(button);
                });
                modalFooter.style.display = '';
            } else {
                modalFooter.style.display = 'none';
            }
            
            // Modal anzeigen
            document.body.classList.add('coding-ars-modal-open');
            modalContainer.style.display = 'block';
            
            // Callback nach dem Öffnen
            if (options.onOpen && typeof options.onOpen === 'function') {
                options.onOpen(modalContainer);
            }
        },
        
        close: () => {
            document.body.classList.remove('coding-ars-modal-open');
            modalContainer.style.display = 'none';
            
            // Callback nach dem Schließen
            if (modalContainer.controller.onClose && 
                typeof modalContainer.controller.onClose === 'function') {
                modalContainer.controller.onClose();
            }
        },
        
        setContent: (content) => {
            if (typeof content === 'string') {
                modalBody.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                modalBody.innerHTML = '';
                modalBody.appendChild(content);
            }
        },
        
        setTitle: (title) => {
            modalTitle.textContent = title;
        },
        
        setOnClose: (callback) => {
            if (typeof callback === 'function') {
                modalContainer.controller.onClose = callback;
            }
        },
        
        isOpen: () => {
            return modalContainer.style.display !== 'none';
        }
    };
    
    return modalContainer;
}