(() => {
  const root=document.querySelector('[data-profile-tools]');
  const button=root?.querySelector('[data-copy-current]');
  if(!root||!button)return;
  const normal=root.dataset.copyLabel||button.textContent||'Copy link';
  const copied=root.dataset.copiedLabel||'Copied';
  button.addEventListener('click',async()=>{
    try{
      await navigator.clipboard.writeText(location.href);
      button.textContent=copied;
      setTimeout(()=>{button.textContent=normal;},1800);
    }catch{
      button.textContent=normal;
    }
  });
})();
