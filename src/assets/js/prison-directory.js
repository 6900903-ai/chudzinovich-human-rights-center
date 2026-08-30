(() => {
  const root=document.querySelector('[data-detention-directory]');
  if(!root)return;
  const search=document.getElementById('detention-search');
  const type=document.getElementById('detention-type');
  const region=document.getElementById('detention-region');
  const status=document.getElementById('detention-status');
  const cards=[...document.querySelectorAll('[data-detention-card]')];
  const foundLabel=root.dataset.foundLabel||'Found';
  const normalize=value=>String(value||'').toLocaleLowerCase('ru').normalize('NFD').replace(/\p{Diacritic}/gu,'').replaceAll('ё','е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  function apply(){
    const q=normalize(search?.value),selectedType=type?.value||'',selectedRegion=region?.value||'';
    let found=0;
    for(const card of cards){
      const matchesQuery=!q||normalize(card.dataset.search).includes(q);
      const matchesType=!selectedType||card.dataset.type===selectedType;
      const matchesRegion=!selectedRegion||card.dataset.region===selectedRegion;
      const visible=matchesQuery&&matchesType&&matchesRegion;
      card.hidden=!visible;if(visible)found++;
    }
    if(status)status.textContent=`${foundLabel}: ${found}`;
  }
  search?.addEventListener('input',apply);
  type?.addEventListener('change',apply);
  region?.addEventListener('change',apply);
})();
