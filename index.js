import { eventSource, event_types } from '../../events.js';
import { main_api } from '../../../script.js';
import { getTokenCountAsync } from '../../tokenizers.js';

let extensionContainer = null;
let maxContextLimit = 4096; // fallback

// UI Elements
let systemSegment, chatSegment, freeSegment, overageSegment;
let systemStats, chatStats, freeStats;
let totalLabel;

function initUI() {
    if (document.getElementById('context-meter-container')) return;

    // Create container
    extensionContainer = document.createElement('div');
    extensionContainer.id = 'context-meter-container';

    // Build the inner HTML
    extensionContainer.innerHTML = `
        <div id="context-meter-header">
            <span class="context-meter-title">Context Meter</span>
            <span class="context-meter-stats" id="context-meter-total">0 / 4096</span>
        </div>
        <div id="context-meter-bar-wrapper">
            <div id="meter-segment-system" class="meter-segment" data-tooltip="System / Lorebook: 0T" style="width: 0%;"></div>
            <div id="meter-segment-chat" class="meter-segment" data-tooltip="Chat History: 0T" style="width: 0%;"></div>
            <div id="meter-segment-free" class="meter-segment" data-tooltip="Free tokens: 0T" style="width: 100%;"></div>
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

    // Determine the max context allowed currently. We rely on the UI elements for typical values.
    const maxOai = Number(document.getElementById('openai_max_context')?.value) || 0;
    const maxTextGen = Number(document.getElementById('max_context')?.value) || 0;
    
    // Choose the largest valid one, or default
    maxContextLimit = Math.max(maxOai, maxTextGen);
    if (!maxContextLimit || maxContextLimit < 1) maxContextLimit = 4096;

    let systemTokens = 0;
    let chatTokens = 0;

    // Count tokens manually for different message roles
    // The 'chatArray' comes from prepareOpenAIMessages Hook
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

    // Calculate percentages
    let maxBar = Math.max(maxContextLimit, totalUsed); // if overflow, expand scale conceptually
    
    const sysPct = (systemTokens / maxBar) * 100;
    const chatPct = (chatTokens / maxBar) * 100;
    const freePct = (freeTokens / maxBar) * 100;
    const overPct = (overageTokens / maxBar) * 100;

    // Update widths
    systemSegment.style.width = \`\${sysPct}%\`;
    chatSegment.style.width = \`\${chatPct}%\`;
    freeSegment.style.width = \`\${freePct}%\`;
    
    if (overageTokens > 0) {
        overageSegment.style.display = 'block';
        overageSegment.style.width = \`\${overPct}%\`;
    } else {
        overageSegment.style.display = 'none';
        overageSegment.style.width = '0%';
    }

    // Update tooltips
    systemSegment.setAttribute('data-tooltip', \`System/Lorebook: \${systemTokens}T\`);
    chatSegment.setAttribute('data-tooltip', \`Chat History: \${chatTokens}T\`);
    freeSegment.setAttribute('data-tooltip', \`Free Space: \${freeTokens}T\`);
    overageSegment.setAttribute('data-tooltip', \`Overage: \${overageTokens}T\`);

    // Update text
    totalLabel.innerText = \`\${totalUsed} / \${maxContextLimit} Tokens\`;
}

// Hook into generation events where context is combined
jQuery(async () => {
    initUI();
    
    // Using CHAT_COMPLETION_PROMPT_READY as the primary source of truth for full prompt assembly
    eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, async (eventData) => {
        if (!eventData || !eventData.chat) return;
        await updateMeter(eventData.chat);
    });

    // Also try to hook message events to maybe do a dirty recalculate?
    // Not strictly needed if ST fires dry runs frequently, but CHAT_COMPLETION_PROMPT_READY is fired by dry runs.
});
