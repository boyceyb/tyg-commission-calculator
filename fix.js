// Complete fix for TYG Commission Calculator
// Fixes: H1/H2 promotions, Senior tiers, Principal tiers

document.addEventListener('DOMContentLoaded', function() {
    let attempts = 0;
    const interval = setInterval(function() {
        attempts++;
        
        if (window.calculator && window.calculator.calculateCommission) {
            clearInterval(interval);
            
            console.log('Applying complete fix (attempt ' + attempts + ')...');
            
            // Save original function
            const origCalc = window.calculator.calculateCommission.bind(window.calculator);
            
            // Override main calculation
            window.calculator.calculateCommission = function(billings, level, isFirstYear, h1Billings, h2Billings) {
                const h1Amount = h1Billings || 0;
                const savedThresholds = JSON.parse(JSON.stringify(this.PROMOTION_THRESHOLDS));
                
                // Disable early promotions if H1 insufficient
                if (h1Amount < 96000) {
                    console.log('H1 insufficient (' + h1Amount + '), using standard thresholds only');
                    this.PROMOTION_THRESHOLDS.earlyH1.senior = 999999999;
                    this.PROMOTION_THRESHOLDS.earlyH1.principal = 999999999;
                }
                
                // Calculate with modified thresholds
                const result = origCalc(billings, level, isFirstYear, h1Billings, h2Billings);
                
                // Restore thresholds
                this.PROMOTION_THRESHOLDS = savedThresholds;
                
                // Fix Senior Consultant tiers if needed
                let needsRecalc = false;
                for (let i = 0; i < result.breakdown.length; i++) {
                    const item = result.breakdown[i];
                    
                    // Fix Senior Consultant starting at wrong tier
                    if (item.level === 'Senior Consultant (30%)') {
                        // Check what total billings were at this point
                        let totalAtThisPoint = 40000; // threshold
                        for (let j = 0; j < i; j++) {
                            totalAtThisPoint += result.breakdown[j].billings;
                        }
                        
                        // If we're under £100k total, this should be 25% not 30%
                        if (totalAtThisPoint < 100000) {
                            const amountAt25 = Math.min(item.billings, 100000 - totalAtThisPoint);
                            const amountAt30 = item.billings - amountAt25;
                            
                            if (amountAt25 > 0) {
                                // Replace this item with correct tiers
                                result.breakdown[i] = {
                                    level: 'Senior Consultant (25%)',
                                    billings: amountAt25,
                                    commission: amountAt25 * 0.25
                                };
                                
                                // Add 30% tier if needed
                                if (amountAt30 > 0) {
                                    result.breakdown.splice(i + 1, 0, {
                                        level: 'Senior Consultant (30%)',
                                        billings: amountAt30,
                                        commission: amountAt30 * 0.30
                                    });
                                }
                                needsRecalc = true;
                            }
                        }
                    }
                }
                
                // Recalculate commission if we made changes
                if (needsRecalc) {
                    result.commission = 0;
                    for (let item of result.breakdown) {
                        result.commission += item.commission;
                    }
                }
                
                // Log for debugging
                if (result.promotionPoints && result.promotionPoints.length > 0) {
                    console.log('Promotions at:', result.promotionPoints);
                }
                
                return result;
            };
            
            // Fix Principal tier calculation
            window.calculator.calculatePrincipalTiers = function(billings, breakdown, startingPoint) {
                // Default to 40k if not provided, but use actual starting point if given
                startingPoint = startingPoint || 40000;
                let commission = 0;
                let remaining = billings;
                let currentTotal = startingPoint;
                
                console.log('Principal starting at total billings:', startingPoint);
                
                // Skip 25% tier if we're already past £100k
                if (currentTotal < 100000) {
                    const tier1Limit = 100000 - currentTotal;
                    const tier1 = Math.min(remaining, tier1Limit);
                    if (tier1 > 0) {
                        commission += tier1 * 0.25;
                        breakdown.push({
                            level: 'Principal Consultant (25%)',
                            billings: tier1,
                            commission: tier1 * 0.25
                        });
                        remaining -= tier1;
                        currentTotal += tier1;
                    }
                }
                
                // 30% tier: £100k-200k
                if (remaining > 0 && currentTotal < 200000) {
                    const tier2Limit = 200000 - currentTotal;
                    const tier2 = Math.min(remaining, tier2Limit);
                    if (tier2 > 0) {
                        commission += tier2 * 0.30;
                        breakdown.push({
                            level: 'Principal Consultant (30%)',
                            billings: tier2,
                            commission: tier2 * 0.30
                        });
                        remaining -= tier2;
                        currentTotal += tier2;
                    }
                }
                
                // 35% tier: £200k-300k
                if (remaining > 0 && currentTotal < 300000) {
                    const tier3Limit = 300000 - currentTotal;
                    const tier3 = Math.min(remaining, tier3Limit);
                    if (tier3 > 0) {
                        commission += tier3 * 0.35;
                        breakdown.push({
                            level: 'Principal Consultant (35%)',
                            billings: tier3,
                            commission: tier3 * 0.35
                        });
                        remaining -= tier3;
                        currentTotal += tier3;
                    }
                }
                
                // 40% tier: £300k-400k
                if (remaining > 0 && currentTotal < 400000) {
                    const tier4Limit = 400000 - currentTotal;
                    const tier4 = Math.min(remaining, tier4Limit);
                    if (tier4 > 0) {
                        commission += tier4 * 0.40;
                        breakdown.push({
                            level: 'Principal Consultant (40%)',
                            billings: tier4,
                            commission: tier4 * 0.40
                        });
                        remaining -= tier4;
                        currentTotal += tier4;
                    }
                }
                
                // 50% tier: £400k+
                if (remaining > 0) {
                    commission += remaining * 0.50;
                    breakdown.push({
                        level: 'Principal Consultant (50%)',
                        billings: remaining,
                        commission: remaining * 0.50
                    });
                }
                
                return commission;
            };
            
            // Fix Senior tier calculation
            window.calculator.calculateSeniorTiers = function(seniorBillings, breakdown, totalBillingsAtStart) {
                let commission = 0;
                let remaining = seniorBillings;
                const startingTotal = totalBillingsAtStart || 40000;
                
                console.log('Senior starting at total billings:', startingTotal);
                
                // First tier: up to £100k total (25%)
                if (startingTotal < 100000) {
                    const tier1Limit = 100000 - startingTotal;
                    const tier1Amount = Math.min(remaining, tier1Limit);
                    
                    if (tier1Amount > 0) {
                        commission += tier1Amount * 0.25;
                        breakdown.push({
                            level: 'Senior Consultant (25%)',
                            billings: tier1Amount,
                            commission: tier1Amount * 0.25
                        });
                        remaining -= tier1Amount;
                    }
                }
                
                // Second tier: £100k+ total (30%)
                if (remaining > 0) {
                    commission += remaining * 0.30;
                    breakdown.push({
                        level: 'Senior Consultant (30%)',
                        billings: remaining,
                        commission: remaining * 0.30
                    });
                }
                
                return commission;
            };
            
            // Override calls to ensure starting points are passed
            const origCalculatePrincipalTiers = window.calculator.calculatePrincipalTiers.bind(window.calculator);
            const origMethod = window.calculator.calculateCommission;
            
            // Intercept and fix calls to calculatePrincipalTiers
            window.calculator.calculateCommission = function(billings, level, isFirstYear, h1Billings, h2Billings) {
                const result = origMethod.call(this, billings, level, isFirstYear, h1Billings, h2Billings);
                
                // If there's a Principal promotion, ensure tiers are correct
                if (result.finalLevel === 'Principal Consultant' && result.promotionPoints && result.promotionPoints.length > 0) {
                    const principalStartPoint = result.promotionPoints[result.promotionPoints.length - 1];
                    
                    // Find and fix Principal entries
                    let principalStartIndex = -1;
                    for (let i = 0; i < result.breakdown.length; i++) {
                        if (result.breakdown[i].level.includes('Principal Consultant')) {
                            principalStartIndex = i;
                            break;
                        }
                    }
                    
                    if (principalStartIndex >= 0 && principalStartPoint) {
                        // Collect all Principal billings
                        let totalPrincipalBillings = 0;
                        for (let i = principalStartIndex; i < result.breakdown.length; i++) {
                            if (result.breakdown[i].level.includes('Principal Consultant')) {
                                totalPrincipalBillings += result.breakdown[i].billings;
                            }
                        }
                        
                        // Remove old Principal entries
                        const beforePrincipal = result.breakdown.slice(0, principalStartIndex);
                        
                        // Recalculate with correct starting point
                        const tempBreakdown = [];
                        const principalCommission = this.calculatePrincipalTiers(totalPrincipalBillings, tempBreakdown, principalStartPoint);
                        
                        // Rebuild breakdown
                        result.breakdown = [...beforePrincipal, ...tempBreakdown];
                        
                        // Recalculate total
                        result.commission = 0;
                        for (let item of result.breakdown) {
                            result.commission += item.commission;
                        }
                    }
                }
                
                return result;
            };
            
            // Recalculate
            window.calculator.updateCalculation();
            
            console.log('✓ Complete fix applied!');
            console.log('✓ H1/H2 promotions fixed');
            console.log('✓ Senior tiers fixed (25% then 30%)');
            console.log('✓ Principal tiers fixed (continues from promotion point)');
            
            // Add save/load functionality with better UI
            setTimeout(function() {
                // Add save/load UI to the sticky header
                const stickyMetrics = document.querySelector('.sticky-metrics');
                if (stickyMetrics && !document.getElementById('saveLoadContainer')) {
                    const saveLoadHTML = `
                        <div id="saveLoadContainer" style="display: flex; align-items: center; gap: 8px; margin-left: 20px; padding-left: 20px; border-left: 1px solid #e2e8f0;">
                            <button id="quickSaveBtn" onclick="window.quickSave()" style="
                                background: transparent;
                                border: 1px solid #cbd5e1;
                                color: #64748b;
                                padding: 4px 10px;
                                border-radius: 4px;
                                font-size: 11px;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s;
                            " onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                                Save
                            </button>
                            <div style="position: relative;">
                                <button id="loadMenuBtn" onclick="window.toggleLoadMenu()" style="
                                    background: transparent;
                                    border: 1px solid #cbd5e1;
                                    color: #64748b;
                                    padding: 4px 10px;
                                    border-radius: 4px;
                                    font-size: 11px;
                                    font-weight: 500;
                                    cursor: pointer;
                                    transition: all 0.2s;
                                    display: flex;
                                    align-items: center;
                                    gap: 4px;
                                " onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                                    Load <span style="font-size: 8px;">▼</span>
                                </button>
                                <div id="loadDropdown" style="
                                    display: none;
                                    position: absolute;
                                    top: 100%;
                                    right: 0;
                                    margin-top: 4px;
                                    background: white;
                                    border: 1px solid #e2e8f0;
                                    border-radius: 6px;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                                    min-width: 200px;
                                    max-height: 300px;
                                    overflow-y: auto;
                                    z-index: 1000;
                                ">
                                    <div id="loadDropdownContent" style="padding: 4px;">
                                        <div style="padding: 8px 12px; color: #94a3b8; font-size: 11px; border-bottom: 1px solid #f1f5f9;">No saved states</div>
                                    </div>
                                </div>
                            </div>
                            <span id="saveIndicator" style="
                                display: none;
                                font-size: 10px;
                                color: #10b981;
                                font-weight: 500;
                                opacity: 0;
                                transition: opacity 0.3s;
                            ">✓ Saved</span>
                        </div>
                    `;
                    stickyMetrics.insertAdjacentHTML('beforeend', saveLoadHTML);
                }
                
                // Quick save function - with custom name option
                window.quickSave = function(customName) {
                    const state = {
                        level: document.getElementById('currentLevel').value,
                        deals: window.calculator.deals,
                        baseSalary: document.getElementById('baseSalary').value,
                        teamBillings: document.getElementById('teamBillings').value,
                        fastTrack: document.getElementById('fastTrackToggleHeader')?.checked || false,
                        savedAt: new Date().toISOString(),
                        name: customName || 'Save ' + new Date().toLocaleString('en-GB', { 
                            day: '2-digit', 
                            month: 'short', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })
                    };
                    
                    // Get existing saves
                    let saves = JSON.parse(localStorage.getItem('tygCalculatorSaves') || '[]');
                    saves.push(state);
                    
                    // Keep only last 20 saves
                    if (saves.length > 20) {
                        saves = saves.slice(-20);
                    }
                    
                    localStorage.setItem('tygCalculatorSaves', JSON.stringify(saves));
                    
                    // Show save indicator
                    const indicator = document.getElementById('saveIndicator');
                    if (indicator) {
                        indicator.style.display = 'inline';
                        indicator.style.opacity = '1';
                        setTimeout(function() {
                            indicator.style.opacity = '0';
                            setTimeout(function() {
                                indicator.style.display = 'none';
                            }, 300);
                        }, 2000);
                    }
                    
                    // Update dropdown if open
                    window.updateLoadDropdown();
                };
                
                // Toggle save menu (new)
                window.toggleSaveMenu = function() {
                    const existingInput = document.getElementById('saveNameInput');
                    if (existingInput) {
                        existingInput.remove();
                        return;
                    }
                    
                    const saveBtn = document.getElementById('quickSaveBtn');
                    const inputDiv = document.createElement('div');
                    inputDiv.id = 'saveNameInput';
                    inputDiv.style.cssText = 'position: absolute; top: 100%; left: 0; margin-top: 4px; background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 1000;';
                    inputDiv.innerHTML = `
                        <input type="text" id="saveNameField" placeholder="Save name..." style="
                            padding: 4px 8px;
                            border: 1px solid #cbd5e1;
                            border-radius: 4px;
                            font-size: 11px;
                            width: 150px;
                            margin-right: 4px;
                        ">
                        <button onclick="window.saveWithName()" style="
                            padding: 4px 8px;
                            background: #10b981;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            font-size: 11px;
                            cursor: pointer;
                        ">Save</button>
                    `;
                    
                    saveBtn.parentElement.style.position = 'relative';
                    saveBtn.parentElement.appendChild(inputDiv);
                    
                    // Focus the input
                    setTimeout(function() {
                        const field = document.getElementById('saveNameField');
                        if (field) {
                            field.focus();
                            field.onkeydown = function(e) {
                                if (e.key === 'Enter') {
                                    window.saveWithName();
                                } else if (e.key === 'Escape') {
                                    inputDiv.remove();
                                }
                            };
                        }
                    }, 10);
                    
                    // Close when clicking outside
                    setTimeout(function() {
                        document.addEventListener('click', function closeInput(e) {
                            if (!inputDiv.contains(e.target) && e.target.id !== 'quickSaveBtn') {
                                inputDiv.remove();
                                document.removeEventListener('click', closeInput);
                            }
                        });
                    }, 10);
                };
                
                // Save with custom name
                window.saveWithName = function() {
                    const nameField = document.getElementById('saveNameField');
                    const name = nameField ? nameField.value.trim() : '';
                    
                    if (name) {
                        window.quickSave(name);
                        document.getElementById('saveNameInput').remove();
                    }
                };
                
                // Update save button to handle click better
                setTimeout(function() {
                    const saveBtn = document.getElementById('quickSaveBtn');
                    if (saveBtn) {
                        saveBtn.onclick = function(e) {
                            e.stopPropagation();
                            if (e.shiftKey || e.ctrlKey) {
                                // Quick save with auto name
                                window.quickSave();
                            } else {
                                // Show name input
                                window.toggleSaveMenu();
                            }
                        };
                        saveBtn.title = 'Click to save with name, Shift+Click for quick save';
                    }
                }, 100);
                
                // Toggle load dropdown
                window.toggleLoadMenu = function() {
                    const dropdown = document.getElementById('loadDropdown');
                    if (dropdown.style.display === 'none') {
                        window.updateLoadDropdown();
                        dropdown.style.display = 'block';
                        
                        // Close when clicking outside
                        setTimeout(function() {
                            document.addEventListener('click', function closeDropdown(e) {
                                if (!dropdown.contains(e.target) && e.target.id !== 'loadMenuBtn') {
                                    dropdown.style.display = 'none';
                                    document.removeEventListener('click', closeDropdown);
                                }
                            });
                        }, 10);
                    } else {
                        dropdown.style.display = 'none';
                    }
                };
                
                // Update load dropdown content with delete buttons
                window.updateLoadDropdown = function() {
                    const saves = JSON.parse(localStorage.getItem('tygCalculatorSaves') || '[]');
                    const content = document.getElementById('loadDropdownContent');
                    
                    if (!content) return;
                    
                    if (saves.length === 0) {
                        content.innerHTML = '<div style="padding: 8px 12px; color: #94a3b8; font-size: 11px;">No saved states</div>';
                        return;
                    }
                    
                    // Build dropdown items with delete buttons
                    let html = '';
                    saves.reverse().forEach((save, index) => {
                        const realIndex = saves.length - 1 - index;
                        const date = new Date(save.savedAt);
                        const timeAgo = getTimeAgo(date);
                        
                        html += `
                            <div style="
                                display: flex;
                                align-items: center;
                                border-bottom: 1px solid #f8fafc;
                                transition: background 0.2s;
                            " onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                                <div onclick="window.loadState(${realIndex})" style="
                                    flex: 1;
                                    padding: 8px 12px;
                                    cursor: pointer;
                                    font-size: 11px;
                                ">
                                    <div style="font-weight: 500; color: #334155; margin-bottom: 2px;">${save.name}</div>
                                    <div style="color: #94a3b8; font-size: 10px;">${timeAgo} • ${save.deals ? save.deals.length : 0} deals</div>
                                </div>
                                <button onclick="window.deleteSave(${realIndex}); event.stopPropagation();" style="
                                    background: transparent;
                                    border: none;
                                    color: #ef4444;
                                    padding: 4px 8px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    opacity: 0.5;
                                    transition: opacity 0.2s;
                                " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'">×</button>
                            </div>
                        `;
                    });
                    
                    // Add clear all at bottom if there are saves
                    if (saves.length > 0) {
                        html += `
                            <div onclick="if(confirm('Clear all saves?')) { localStorage.removeItem('tygCalculatorSaves'); window.updateLoadDropdown(); }" style="
                                padding: 6px 12px;
                                cursor: pointer;
                                border-top: 1px solid #e2e8f0;
                                color: #ef4444;
                                font-size: 10px;
                                text-align: center;
                                transition: background 0.2s;
                            " onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'">
                                Clear All
                            </div>
                        `;
                    }
                    
                    content.innerHTML = html;
                };
                
                // Delete individual save
                window.deleteSave = function(index) {
                    let saves = JSON.parse(localStorage.getItem('tygCalculatorSaves') || '[]');
                    if (index >= 0 && index < saves.length) {
                        saves.splice(index, 1);
                        localStorage.setItem('tygCalculatorSaves', JSON.stringify(saves));
                        window.updateLoadDropdown();
                    }
                };
                
                // Load specific state
                window.loadState = function(index) {
                    const saves = JSON.parse(localStorage.getItem('tygCalculatorSaves') || '[]');
                    if (index < 0 || index >= saves.length) return;
                    
                    const state = saves[index];
                    
                    // Restore the state
                    document.getElementById('currentLevel').value = state.level;
                    document.getElementById('baseSalary').value = state.baseSalary || '';
                    document.getElementById('teamBillings').value = state.teamBillings || '';
                    
                    const fastTrackToggle = document.getElementById('fastTrackToggleHeader');
                    if (fastTrackToggle) {
                        fastTrackToggle.checked = state.fastTrack || false;
                    }
                    
                    // Clear and restore deals
                    window.calculator.deals = [];
                    if (state.deals && state.deals.length > 0) {
                        state.deals.forEach(deal => {
                            window.calculator.deals.push(deal);
                        });
                    }
                    
                    // Update display
                    window.calculator.updateDealsDisplay();
                    window.calculator.updateCalculation();
                    
                    // Close dropdown
                    document.getElementById('loadDropdown').style.display = 'none';
                    
                    // Show loaded indicator
                    const indicator = document.getElementById('saveIndicator');
                    if (indicator) {
                        indicator.textContent = '✓ Loaded';
                        indicator.style.color = '#3b82f6';
                        indicator.style.display = 'inline';
                        indicator.style.opacity = '1';
                        setTimeout(function() {
                            indicator.style.opacity = '0';
                            setTimeout(function() {
                                indicator.style.display = 'none';
                                indicator.textContent = '✓ Saved';
                                indicator.style.color = '#10b981';
                            }, 300);
                        }, 2000);
                    }
                };
                
                // Helper function for time ago
                function getTimeAgo(date) {
                    const seconds = Math.floor((new Date() - date) / 1000);
                    if (seconds < 60) return 'just now';
                    const minutes = Math.floor(seconds / 60);
                    if (minutes < 60) return minutes + ' min ago';
                    const hours = Math.floor(minutes / 60);
                    if (hours < 24) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
                    const days = Math.floor(hours / 24);
                    return days + ' day' + (days > 1 ? 's' : '') + ' ago';
                }
                
                // Auto-save every 30 seconds
                setInterval(function() {
                    if (window.calculator && window.calculator.deals && window.calculator.deals.length > 0) {
                        window.quickSave();
                    }
                }, 30000);
                
            }, 1000);
            
            // Fix the empty state display text for Principal rates - more aggressive approach
            setInterval(function() {
                // Find all elements that might contain the wrong text
                const allElements = document.querySelectorAll('*');
                allElements.forEach(element => {
                    if (element.innerHTML && typeof element.innerHTML === 'string') {
                        // Check if this element contains the wrong text
                        if (element.innerHTML.includes('Principal Consultant:') && 
                            element.innerHTML.includes('30-50% tiered rates')) {
                            element.innerHTML = element.innerHTML.replace('30-50% tiered rates', '25-50% tiered rates');
                            console.log('Fixed Principal text from 30-50% to 25-50%');
                        }
                        // Also fix if it's in a different format
                        if (element.innerHTML.includes('Principal Consultant:</strong> £40,000 minimum • 30-50%')) {
                            element.innerHTML = element.innerHTML.replace('30-50%', '25-50%');
                        }
                    }
                });
            }, 200); // Check every 200ms
            
            // Fix random 0 appearing in deal value input
            const dealValueInput = document.getElementById('dealValue');
            if (dealValueInput) {
                // Clear any default value
                if (dealValueInput.value === '0') {
                    dealValueInput.value = '';
                }
                
                // Prevent 0 from being set as default
                const origSetAttribute = dealValueInput.setAttribute.bind(dealValueInput);
                dealValueInput.setAttribute = function(name, value) {
                    if (name === 'value' && value === '0') {
                        return; // Don't set if it's 0
                    }
                    return origSetAttribute(name, value);
                };
                
                // Monitor for unwanted changes
                const observer = new MutationObserver(function() {
                    if (dealValueInput.value === '0' && document.activeElement !== dealValueInput) {
                        dealValueInput.value = '';
                    }
                });
                observer.observe(dealValueInput, { attributes: true, attributeFilter: ['value'] });
            }
            
            // Override deal display to show commission percentage with better alignment
            const origUpdateDealsDisplay = window.calculator.updateDealsDisplay.bind(window.calculator);
            window.calculator.updateDealsDisplay = function() {
                const dealsList = document.getElementById('dealsList');
                
                if (this.deals.length === 0) {
                    dealsList.innerHTML = '';
                    this.updateStickyHeaderFromCurrentData();
                    return;
                }

                // Rebuild the deals display with percentage and better alignment
                dealsList.innerHTML = this.deals.map((deal, index) => {
                    const commission = this.calculateDealCommission(deal.value, deal.period, index);
                    const percentage = ((commission / deal.value) * 100).toFixed(1);
                    
                    return `
                        <div class="deal-item ${deal.period.toLowerCase()}" style="display: grid !important; grid-template-columns: 80px 50px 120px 70px 100px 30px !important; align-items: center !important; gap: 12px !important; padding: 12px 16px;">
                            <span class="deal-number" style="font-size: 11px; font-weight: 500; color: #94a3b8;">Deal ${index + 1}</span>
                            <span class="deal-period-badge ${deal.period.toLowerCase()}" style="text-align: center; justify-self: center;">${deal.period}</span>
                            <span class="deal-value" style="font-weight: 500; color: #1e293b; text-align: right;">${this.formatCurrency(deal.value)}</span>
                            <span class="deal-percentage" style="background: #1e40af; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-align: center; justify-self: center;">${percentage}%</span>
                            <span class="deal-commission" style="color: #059669; font-weight: 500; text-align: right;">+${this.formatCurrency(commission)}</span>
                            <button class="deal-remove" onclick="window.calculator.removeDeal(${deal.id})" title="Remove deal" style="background: transparent; border: none; color: #94a3b8; padding: 4px; cursor: pointer; font-size: 18px; line-height: 1; justify-self: end;">×</button>
                        </div>
                    `;
                }).join('');

                this.updateStickyHeaderFromCurrentData();
                console.log('Deal display updated with alignment');
            };
            
            // Force immediate update
            if (window.calculator.deals && window.calculator.deals.length > 0) {
                window.calculator.updateDealsDisplay();
            }
            
            // Override the breakdown display to show promotion amounts
            const origUpdateBreakdown = window.calculator.updateBreakdown.bind(window.calculator);
            window.calculator.updateBreakdown = function(breakdown, belowThreshold) {
                // First call the original
                origUpdateBreakdown(breakdown, belowThreshold);
                
                // Then update promotion indicators with amounts
                const breakdownDiv = document.getElementById('breakdown');
                if (breakdownDiv && !breakdownDiv.classList.contains('hidden')) {
                    const promotionIndicators = breakdownDiv.querySelectorAll('.promotion-indicator-text');
                    const result = this.lastCalculationResult;
                    
                    if (result && result.promotionPoints && promotionIndicators.length > 0) {
                        let promotionIndex = 0;
                        promotionIndicators.forEach(indicator => {
                            if (promotionIndex < result.promotionPoints.length) {
                                const amount = result.promotionPoints[promotionIndex];
                                const formattedAmount = '£' + (amount / 1000).toFixed(0) + 'k';
                                indicator.textContent = 'Promoted @ ' + formattedAmount;
                                promotionIndex++;
                            }
                        });
                    }
                }
            };
            
            // Store the result for reference
            const origCalcMethod = window.calculator.calculateCommission;
            window.calculator.calculateCommission = function(billings, level, isFirstYear, h1Billings, h2Billings) {
                const result = origCalcMethod.call(this, billings, level, isFirstYear, h1Billings, h2Billings);
                this.lastCalculationResult = result; // Store for the breakdown update
                return result;
            };
        }
        
        if (attempts > 50) {
            clearInterval(interval);
            console.error('Could not apply fix - calculator not found');
        }
    }, 100);
});
