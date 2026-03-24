// frontend/js/api.js
const API_BASE = "http://localhost:5000/api";

async function addPatient(doctorId,name,age,phone){
  return await fetch(`${API_BASE}/patients/add`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({doctorId,name,age,phone})
  }).then(res=>res.json());
}

async function addTreatment(patientId,toothNumber,diagnosis,treatment){
  return await fetch(`${API_BASE}/treatments/add`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({patientId,toothNumber,diagnosis,treatment})
  }).then(res=>res.json());
}
