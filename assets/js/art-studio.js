let artState='ready';
const slider=document.querySelector('#cooking');
function paint(){
  document.querySelectorAll('fry-art').forEach(art=>art.setState(artState,Number(slider.value)/100));
  document.querySelector('output').textContent=`${slider.value}%`;
  document.querySelectorAll('[data-state]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.state===artState)));
}
document.querySelectorAll('[data-state]').forEach(button=>button.addEventListener('click',()=>{
  artState=button.dataset.state;
  if(artState==='completed')slider.value='100';
  if(artState==='ready')slider.value='0';
  paint();
}));
slider.addEventListener('input',()=>{if(artState==='completed')artState='heating';paint();});
paint();
