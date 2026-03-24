const teeth = document.querySelectorAll('.tooth');
teeth.forEach(tooth => {
  tooth.addEventListener('click', () => {
    const toothNumber = tooth.dataset.tooth;
    const diagnosis = prompt(`أدخل التشخيص للسن ${toothNumber}:`);
    const treatment = prompt(`أدخل العلاج للسن ${toothNumber}:`);
    if(diagnosis && treatment){
      fetch('/api/treatments/add',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({patientId:"PATIENT_ID",toothNumber,diagnosis,treatment})
      }).then(res=>res.json())
        .then(data=>alert(`تم إضافة العلاج للسن ${toothNumber}`));
    }
  });
});

document.getElementById('addPatientForm').addEventListener('submit', async(e)=>{
  e.preventDefault();
  const name = document.getElementById('patientName').value;
  const age = document.getElementById('patientAge').value;
  const phone = document.getElementById('patientPhone').value;
  const doctorId = "DOCTOR_ID"; // استبدل بمعرف الطبيب بعد تسجيل الدخول

  const res = await fetch('/api/patients/add',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({doctorId,name,age,phone})
  });
  const data = await res.json();
  if(res.status===403) alert(data.message);
  else alert(`تم إضافة المريض ${name}`);
});