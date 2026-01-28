
import { API, ICONS, TOAST_TYPE } from '../../constants.js';
import { Result } from '../../utils/result.js';
import { getEl } from '../../utils/dom.js';
import { adminState } from './state.js';
import { Toast } from '../../components/toast.js';

export async function triggerMaintenance() {
    if (!confirm("Run Archiver & Maintenance? This will check for limits and sync files to Cloud.")) return;
    Toast.info('Triggering maintenance...');

    const result = await adminState.github.dispatchWorkflow('archive_chapters.yml');
    if (result.ok) Toast.success('Maintenance queued! Check GitHub Actions.');
    else Toast.error('Failed to trigger maintenance');
}

export async function triggerDeploy() {
    const btn = getEl('btn-deploy');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('deploying');
        btn.innerHTML = `<svg class="icon-sm"><use href="#icon-rocket"/></svg><span>Deploying...</span>`;
    }

    const modal = getEl('modal-deploy');
    const overlay = getEl('modal-overlay');
    if (modal) modal.classList.remove('hidden');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.onclick = null;
    }

    resetDeploySteps();
    setDeployStep('trigger', 'active');
    updateDeployProgress(5, 'Triggering workflow...');

    const result = await adminState.github.dispatchWorkflow('deploy.yml');

    if (result.ok) {
        setDeployStep('trigger', 'complete', ICONS.SUCCESS);
        setDeployStep('queue', 'active');
        updateDeployProgress(15, 'Waiting for workflow to start...');
        setTimeout(() => pollDeployStatus(btn), 2000);
    } else {
        setDeployStep('trigger', 'error', ICONS.ERROR);
        updateDeployProgress(0, 'Workflow not found or failed!');
        Toast.error('Deploy failed');
        resetDeployButton(btn);
    }
}

function resetDeploySteps() {
    ['trigger', 'queue', 'build', 'deploy', 'done'].forEach(step => {
        const el = getEl(`deploy-step-${step}`);
        if (!el) return;
        el.className = 'deploy-step';
        el.querySelector('.step-icon').innerHTML = ICONS.PENDING;
    });
    const trigger = getEl('deploy-step-trigger');
    if (trigger) trigger.querySelector('.step-icon').innerHTML = ICONS.SPINNER;
}

function setDeployStep(step, status, iconHTML = null) {
    const el = getEl(`deploy-step-${step}`);
    if (!el) return;

    
    el.className = 'deploy-step';
    el.classList.add(status);

    const icon = el.querySelector('.step-icon');
    if (icon) {
        if (iconHTML) icon.innerHTML = iconHTML;
        else if (status === 'active') icon.innerHTML = ICONS.SPINNER;
    }
}

function updateDeployProgress(percent, text) {
    const fill = getEl('deploy-progress-fill');
    const status = getEl('deploy-status-text');
    if (fill) fill.style.width = `${percent}%`;
    if (status) status.textContent = text;
}

async function pollDeployStatus(btn) {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
        attempts++;

        if (attempts > maxAttempts) {
            updateDeployProgress(50, 'Timeout - check GitHub Actions for status');
            Toast.warning('Status check timed out.');
            resetDeployButton(btn);
            return;
        }

        try {
            const result = await adminState.github.getWorkflowRuns(5);

            if (!result.ok) {
                setTimeout(poll, 2000);
                return;
            }

            const data = result.value;
            const runs = data.workflow_runs || [];
            const deployRun = runs.find(r => r.name === 'Deploy to Cloudflare Pages');

            if (!deployRun) {
                updateDeployProgress(20, 'Waiting for workflow to start...');
                setTimeout(poll, 2000);
                return;
            }

            const status = deployRun.status;
            const conclusion = deployRun.conclusion;

            if (status === 'queued') {
                setDeployStep('queue', 'active');
                updateDeployProgress(25, 'Workflow queued...');
                setTimeout(poll, 2000);
            } else if (status === 'in_progress') {
                setDeployStep('queue', 'complete', ICONS.SUCCESS);
                setDeployStep('build', 'active');
                updateDeployProgress(50, 'Building and deploying...');
                setTimeout(poll, 3000);
            } else if (status === 'completed') {
                if (conclusion === 'success') {
                    setDeployStep('queue', 'complete', ICONS.SUCCESS);
                    setDeployStep('build', 'complete', ICONS.SUCCESS);
                    setDeployStep('deploy', 'complete', ICONS.SUCCESS);
                    setDeployStep('done', 'complete', ICONS.SUCCESS);
                    updateDeployProgress(100, 'Deployment successful!');
                    Toast.success('Site deployed!');
                    setTimeout(() => {
                        const modal = getEl('modal-deploy');
                        const overlay = getEl('modal-overlay');
                        if (modal) modal.classList.add('hidden');
                        if (overlay) overlay.classList.add('hidden');
                        resetDeployButton(btn);
                    }, 2000);
                } else {
                    setDeployStep('build', 'error', ICONS.ERROR);
                    updateDeployProgress(50, `Deployment failed: ${conclusion}`);
                    Toast.error(`Failed: ${conclusion}`);
                    resetDeployButton(btn);
                }
            } else {
                setTimeout(poll, 2000);
            }
        } catch (e) {
            setTimeout(poll, 3000);
        }
    };

    poll();
}

function resetDeployButton(btn) {
    if (!btn) return;
    const originalText = `<svg class="icon-sm"><use href="#icon-rocket"/></svg><span>Deploy</span>`;
    setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('deploying');
        btn.innerHTML = originalText;
    }, 1000);
}
