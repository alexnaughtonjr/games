// Embeddable "made for the jam" badge. Usage: <script src=".../dental-jam/badge.js" data-entry="My Tool" async></script>
(function(){ var s=document.currentScript; var name=(s&&s.dataset.entry)||'entry'; var a=document.createElement('a');
 a.href=(s&&s.src?s.src.replace(/badge\.js.*$/,''):'#'); a.target='_blank'; a.rel='noopener';
 a.textContent='🦷 built for Dental Build Jam (prototype) · '+name;
 a.style.cssText='position:fixed;right:12px;bottom:12px;z-index:99999;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:8px;padding:6px 10px;font:12px "JetBrains Mono",ui-monospace,monospace;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.4)';
 (document.body?document.body.appendChild(a):addEventListener('DOMContentLoaded',function(){document.body.appendChild(a);}));
})();
