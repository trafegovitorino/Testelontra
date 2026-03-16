document.addEventListener('DOMContentLoaded', () => {
    (function () {
        const urlParams = new URLSearchParams(window.location.search);
        const scriptTag = document.querySelector('script[data-origin-url]');
        const originUrl = scriptTag ? scriptTag.getAttribute('data-origin-url') : null;

        // Format special characters
        const formatSpecialCharacters = (inputString) =>
            inputString.replace(/ /g, '_s_').replace(/-/g, '_d_').replace(/\//g, '');

        // Handle gclid
        if (urlParams.has('gclid')) {
            const gclid = urlParams.get('gclid');
            localStorage.setItem('gclid', gclid);
        }

        const gclid = urlParams.get('gclid') || localStorage.getItem('gclid');

        // Determine campaign ID
        const adCampaignId = gclid || urlParams.get('wbraid') || urlParams.get('msclkid') || urlParams.get('fbclid');
        let modifiedCampaignId = adCampaignId;

        // Update URL parameters
        const updatedUrlParamsString = urlParams.toString();

        if (updatedUrlParamsString) {
            const pageLinks = document.querySelectorAll('a');

            pageLinks.forEach((link) => {
                const anchorHash = link.hash;
                let linkHref = link.href.split('#')[0];

                // Update link with campaign ID
                if (modifiedCampaignId) {
                    linkHref = linkHref.replace('[sclid]', modifiedCampaignId).replace('%5Bsclid%5D', modifiedCampaignId);
                }

                // Append parameters to link
                if (!linkHref.includes('?')) {
                    linkHref += '?' + updatedUrlParamsString;
                } else {
                    linkHref += '&' + updatedUrlParamsString;
                }

                // Update link href
                link.href = linkHref + anchorHash;
            });

            // Send visit data to server
            if (adCampaignId && originUrl) {
                const ajaxUrl = `${originUrl}/wp-admin/admin-ajax.php?action=lontraads_record_visit`;
                fetch(ajaxUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ clickId: adCampaignId }),
                })
                .catch(error => {
                    console.error('LontraAds: Erro ao enviar dados do visitante:', error);
                });
            }
        }

        // === Rastrear cliques de saída (taxa de fuga) ===
        if (originUrl) {
            document.addEventListener('click', function(e) {
                const link = e.target.closest('a');
                if (!link || !link.href) return;

                const clickedUrl = link.href;

                // Ignora links não-HTTP
                if (!clickedUrl.startsWith('http')) return;

                // Ignora links do mesmo domínio
                let clickedHost = '';
                try { clickedHost = new URL(clickedUrl).hostname; } catch (err) { return; }
                if (clickedHost === window.location.hostname) return;

                const ajaxUrl = `${originUrl}/wp-admin/admin-ajax.php?action=lontraads_record_exit_click`;
                fetch(ajaxUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        domain:     window.location.hostname,
                        clickedUrl: clickedUrl,
                        clickId:    adCampaignId || ''
                    }),
                })
                .catch(() => {});
            }, true);
        }

    })();
}).catch(error => {
    console.error('LontraAds: Erro durante a execução do script:', error);
});
