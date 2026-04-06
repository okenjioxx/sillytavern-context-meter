import { eventSource, event_types } from '../../events.js';
import { getTokenCountAsync } from '../../tokenizers.js';

let extensionContainer = null;
let maxContextLimit = 4096; // fallback

// UI Elements
let systemSegment, chatSegment, freeSegment, overageSegment;
let totalLabel;

/**
 * Formats a number with comma separators
 */
function formatNumber(num) {
    return num.toLocaleString();
}

function initUI() {
    if (document.getElementById('context-meter-container')) return;

    // Create container
    extensionContainer = document.createElement('div');
    extensionContainer.id = 'context-meter-container';

    // Build the inner HTML with a nice SVG icon
    extensionContainer.innerHTML = `
        <div id="context-meter-header">
            <div class="context-meter-title-wrap">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 8V16C21 18.7614 16.9706 21 12 21C7.02944 21 3 18.7614 3 16V8M21 8C21 10.7614 16.9706 13 12 13C7.02944 13 3 10.7614 3 8M21 8C21 5.23858 16.9706 3 12 3C7.02944 3 3 5.23858 3 8M21 12C21 14.7614 16.9706 17 12 17C7.02944 17 3 14.7614 3 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Context Meter</span>
            </div>
            <span class="context-meter-stats" id="context-meter-total">0 / 4,096 Tokens</span>
        </div>
        <div id="context-meter-bar-wrapper">
            <div id="meter-segment-system" class="meter-segment" data-tooltip="System: 0T" style="width: 0%;"></div>
            <div id="meter-segment-chat" class="meter-segment" data-tooltip="Chat: 0T" style="width: 0%;"></div>
            <div id="meter-segment-free" class="meter-segment" data-tooltip="Free: 0T" style="width: 100%;"></div>
            <div id="meter-segment-overage" class="meter-segment" data-tooltip="Overage: 0T" style="width: 0%; display: none;"></div>
        </div>
    `;

    // Try finding a good place: above the chat form
    const chatForm = document.getElementById('send_form');
    if (chatForm) {
        chatForm.parentNode.insertBefore(extensionContainer, chatForm);
    } else {
        // Fallback to right menu tab
        const navPanel = document.getElementById('rm_api_block');
        if (navPanel) {
            navPanel.prepend(extensionContainer);
        }
    }

    // Cache DOM refs
    systemSegment = document.getElementById('meter-segment-system');
    chatSegment = document.getElementById('meter-segment-chat');
    freeSegment = document.getElementById('meter-segment-free');
    overageSegment = document.getElementById('meter-segment-overage');
    totalLabel = document.getElementById('context-meter-total');
}

/**
 * Recalculate and update the UI
 */
async function updateMeter(chatArray) {
    if (!extensionContainer) initUI();

    const maxOai = Number(document.getElementById('openai_max_context')?.value) || 0;
    const maxTextGen = Number(document.getElementById('max_context')?.value) || 0;
    
    maxContextLimit = Math.max(maxOai, maxTextGen);
    if (!maxContextLimit || maxContextLimit < 1) maxContextLimit = 4096;

    let systemTokens = 0;
    let chatTokens = 0;

    for (let msg of chatArray) {
        let text = msg.content || "";
        let count = await getTokenCountAsync(text);
        
        if (msg.role === 'system') {
            systemTokens += count;
        } else {
            chatTokens += count;
        }
    }

    const totalUsed = systemTokens + chatTokens;
    let freeTokens = maxContextLimit - totalUsed;
    let overageTokens = 0;

    if (freeTokens < 0) {
        overageTokens = Math.abs(freeTokens);
        freeTokens = 0;
    }

    let maxBar = Math.max(maxContextLimit, totalUsed);
    
    const sysPct = (systemTokens / maxBar) * 100;
    const chatPct = (chatTokens / maxBar) * 100;
    const freePct = (freeTokens / maxBar) * 100;
    const overPct = (overageTokens / maxBar) * 100;

    systemSegment.style.width = `${sysPct}%`;
    chatSegment.style.width = `${chatPct}%`;
    freeSegment.style.width = `${freePct}%`;
    
    if (overageTokens > 0) {
        overageSegment.style.display = 'block';
        overageSegment.style.width = `${overPct}%`;
    } else {
        overageSegment.style.display = 'none';
        overageSegment.style.width = '0%';
    }

    // Update tooltips with formatted numbers
    systemSegment.setAttribute('data-tooltip', `System/Lorebook: ${formatNumber(systemTokens)}T`);
    chatSegment.setAttribute('data-tooltip', `Chat History: ${formatNumber(chatTokens)}T`);
    freeSegment.setAttribute('data-tooltip', `Free Space: ${formatNumber(freeTokens)}T`);
    overageSegment.setAttribute('data-tooltip', `Overage: ${formatNumber(overageTokens)}T`);

    // Update text with formatted numbers
    totalLabel.innerText = `${formatNumber(totalUsed)} / ${formatNumber(maxContextLimit)} Tokens`;
}

jQuery(async () => {
    initUI();
    
    eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, async (eventData) => {
        if (!eventData || !eventData.chat) return;
        await updateMeter(eventData.chat);
    });
});
