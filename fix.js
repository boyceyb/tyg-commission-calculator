// Complete fix for TYG Commission Calculator
// Fixes: H1/H2 promotions, Senior tiers, Principal tiers, Fast-Track UI, Enter key

document.addEventListener('DOMContentLoaded', function() {
    let attempts = 0;
    const interval = setInterval(function() {
        attempts++;
        
        if (window.calculator && window.calculator.calculateCommission) {
            clearInterval(interval);
            
            console.log('Applying complete fix (attempt ' + attempts + ')...');
            
            // Fix random 0 appearing in deal value input and Enter key - with longer delay
            // Wait 3.5 seconds for the page to fully initialize
            setTimeout(function() {
                console.log('Starting Enter key fix...');
                
                // Attach Enter key handler with retry logic
                let attempts = 0;
                const attachEnterKey = setInterval(function() {
                    attempts++;
                    const dealValueInput = document.getElementById('dealValue');
                    
                    if (dealValueInput && !dealValueInput.hasEnterKeyFixed) {
                        // Clear any default value
                        if (dealValueInput.value === '0' || dealValueInput.value === 0) {
                            dealValueInput.value = '';
                        }
                        
                        // Mark as fixed
                        dealValueInput.hasEnterKeyFixed = true;
                        
                        // Add Enter key handler
                        dealValueInput.addEventListener('keydown', function(e) {
                            if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Enter key pressed - adding deal');
                                if (window.addDeal) {
                                    window.addDeal();
                                } else {
                                    console.error('addDeal function not found');
                                }
                                return false;
                            }
                        });
                        
                        console.log('✓ Enter key handler attached successfully!');
                        clearInterval(attachEnterKey);
                    }
                    
                    // Stop trying after 30 attempts (6 seconds)
                    if (attempts > 30) {
                        console.error('Could not attach Enter key handler - input not found');
                        clearInterval(attachEnterKey);
                    }
                }, 200); // Check every 200ms
                
                // Also clear any 0 values periodically
                setInterval(function() {
                    const input = document.getElementById('dealValue');
                    if (input && input.value === '0' && document.activeElement !== input) {
                        input.value = '';
                    }
                }, 500);
                
            }, 3500); // Wait 3.5 seconds for page to fully load
            
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
            
            // Override deal display to show commission percentage with better alignment
            const origUpdateDealsDisplay = window.calculator.updateDealsDisplay.bind(window.calculator);
            window.calculator.updateDealsDisplay = function() {
                const dealsList = document.getElementById('dealsList');
                
                if (this.deals.length === 0) {
                    dealsList.innerHTML = '';
                    this.updateStickyHeaderFromCurrentData();
                    return;
                }
                
                // Check if Fast-Track is enabled
                const fastTrackEnabled = document.getElementById('fastTrackToggleHeader')?.checked;
                const currentLevel = document.getElementById('currentLevel').value;
                const isInFastTrack = fastTrackEnabled && currentLevel === 'Consultant';

                // Rebuild the deals display with percentage and better alignment
                dealsList.innerHTML = this.deals.map((deal, index) => {
                    const commission = this.calculateDealCommission(deal.value, deal.period, index);
                    const percentage = ((commission / deal.value) * 100).toFixed(1);
                    
                    // Show "FT" for Fast-Track mode, otherwise show H1/H2
                    const periodDisplay = isInFastTrack ? 'FT' : deal.period;
                    const periodClass = isInFastTrack ? 'ft' : deal.period.toLowerCase();
                    
                    return `
                        <div class="deal-item ${periodClass}" style="display: grid !important; grid-template-columns: 80px 50px 120px 70px 100px 30px !important; align-items: center !important; gap: 12px !important; padding: 12px 16px; ${isInFastTrack ? 'background: #fef3c7; border-color: #fbbf24;' : ''}">
                            <span class="deal-number" style="font-size: 11px; font-weight: 500; color: #94a3b8;">Deal ${index + 1}</span>
                            <span class="deal-period-badge" style="text-align: center; justify-self: center; ${isInFastTrack ? 'background: #fbbf24; color: #78350f; font-weight: 600;' : ''}">${periodDisplay}</span>
                            <span class="deal-value" style="font-weight: 500; color: #1e293b; text-align: right;">${this.formatCurrency(deal.value)}</span>
                            <span class="deal-percentage" style="background: ${isInFastTrack ? '#f59e0b' : '#1e40af'}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-align: center; justify-self: center;">${percentage}%</span>
                            <span class="deal-commission" style="color: ${isInFastTrack ? '#d97706' : '#059669'}; font-weight: 500; text-align: right;">+${this.formatCurrency(commission)}</span>
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
            
            // Recalculate
            window.calculator.updateCalculation();
            
            console.log('✓ Complete fix applied!');
            console.log('✓ H1/H2 promotions fixed');
            console.log('✓ Senior tiers fixed (25% then 30%)');
            console.log('✓ Principal tiers fixed (continues from promotion point)');
            
            // Add Fast-Track toggle behavior fixes - MORE AGGRESSIVE
            setInterval(function() {
                const fastTrackToggle = document.getElementById('fastTrackToggleHeader');
                const currentLevelSelect = document.getElementById('currentLevel');
                const periodSelector = document.getElementById('periodSelector');
                const periodHelperText = document.getElementById('periodHelperText');
                const fastTrackContainer = document.getElementById('fastTrackContainerHeader');
                
                if (fastTrackToggle && currentLevelSelect) {
                    const currentLevel = currentLevelSelect.value;
                    const isChecked = fastTrackToggle.checked;
                    
                    // RULE 1: If not Consultant, Fast-Track must be OFF and HIDDEN
                    if (currentLevel !== 'Consultant') {
                        // Force Fast-Track OFF
                        if (isChecked) {
                            fastTrackToggle.checked = false;
                            console.log('Forced Fast-Track OFF - not Consultant');
                        }
                        // Hide the entire Fast-Track toggle
                        if (fastTrackContainer) {
                            fastTrackContainer.style.display = 'none';
                        }
                        // Make sure period selector is visible
                        if (periodSelector) periodSelector.style.display = 'flex';
                        if (periodHelperText) periodHelperText.style.display = 'block';
                        // Ensure level selector is enabled
                        currentLevelSelect.disabled = false;
                        currentLevelSelect.style.opacity = '1';
                    } else {
                        // RULE 2: If Consultant, show Fast-Track option
                        if (fastTrackContainer) {
                            fastTrackContainer.style.display = 'inline-flex';
                        }
                        
                        // RULE 3: If Fast-Track is ON, lock everything
                        if (isChecked) {
                            // Force level to stay Consultant
                            if (currentLevelSelect.value !== 'Consultant') {
                                currentLevelSelect.value = 'Consultant';
                                console.log('Forced level back to Consultant');
                            }
                            // Disable level selector
                            currentLevelSelect.disabled = true;
                            currentLevelSelect.style.opacity = '0.5';
                            currentLevelSelect.style.cursor = 'not-allowed';
                            // Hide period selector
                            if (periodSelector) periodSelector.style.display = 'none';
                            if (periodHelperText) periodHelperText.style.display = 'none';
                        } else {
                            // Fast-Track OFF - enable everything
                            currentLevelSelect.disabled = false;
                            currentLevelSelect.style.opacity = '1';
                            currentLevelSelect.style.cursor = 'pointer';
                            // Show period selector
                            if (periodSelector) periodSelector.style.display = 'flex';
                            if (periodHelperText) periodHelperText.style.display = 'block';
                        }
                    }
                    
                    // Update deals display if needed
                    if (window.calculator && window.calculator.deals && window.calculator.deals.length > 0) {
                        // Check if deals need updating
                        const firstDeal = document.querySelector('.deal-period-badge');
                        if (firstDeal) {
                            const showsFT = firstDeal.textContent === 'FT';
                            const shouldShowFT = isChecked && currentLevel === 'Consultant';
                            if (showsFT !== shouldShowFT) {
                                window.calculator.updateDealsDisplay();
                                console.log('Updated deals display for Fast-Track');
                            }
                        }
                    }
                }
            }, 100); // Check every 100ms - aggressive enforcement
            
            console.log('✓ Fast-Track aggressive enforcement started');
            
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
        }
        
        if (attempts > 50) {
            clearInterval(interval);
            console.error('Could not apply fix - calculator not found');
        }
    }, 100);
});
