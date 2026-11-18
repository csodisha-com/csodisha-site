/* Extracted from community/join/index.html for strict CSP (v151). */
(function(){
'use strict';

const state = document.getElementById('state');
const district = document.getElementById('district');
const form = document.getElementById('joinForm');
const status = document.getElementById('status');

const fallbackOdisha = [
'Angul','Balangir','Balasore','Bargarh','Bhadrak','Boudh',
'Cuttack','Deogarh','Dhenkanal','Gajapati','Ganjam','Jagatsinghpur',
'Jajpur','Jharsuguda','Kalahandi','Kandhamal','Kendrapara',
'Kendujhar','Khordha','Koraput','Malkangiri','Mayurbhanj',
'Nabarangpur','Nayagarh','Nuapada','Puri','Rayagada',
'Sambalpur','Subarnapur','Sundargarh'
];

const states = [
'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
'Uttarakhand','West Bengal','Andaman and Nicobar Islands',
'Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
];

function option(text){
const el = document.createElement('option');
el.value = text;
el.textContent = text;
return el;
}

states.forEach(s=>state.appendChild(option(s)));

function districtData(){
const sources = [
window.CSO_INDIA_DISTRICTS,
window.INDIA_DISTRICTS,
window.indiaDistricts,
window.CSO_DISTRICTS
];
for(const source of sources){
if(source && typeof source === 'object') return source;
}
return {};
}

function updateDistricts(){
district.replaceChildren();
district.appendChild(option(''));
district.options[0].textContent = 'Select district';
const data = districtData();
const selected = state.value;
let list = data[selected] || data[selected.toUpperCase()] || [];
if(!Array.isArray(list)) list = [];
if(selected === 'Odisha' && !list.length) list = fallbackOdisha;
list.forEach(d=>{
if(typeof d === 'string') district.appendChild(option(d));
});
district.disabled = !selected || !list.length;
if(!list.length){
district.options[0].textContent = selected
? 'District list unavailable for this state'
: 'Select state first';
}
}

state.value = 'Odisha';
updateDistricts();
state.addEventListener('change',updateDistricts);

form.addEventListener('submit',function(e){
e.preventDefault();
if(!form.reportValidity()) return;
status.textContent =
'Form details are valid. Registration will become available after backend integration.';
});
})();
