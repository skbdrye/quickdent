import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PatientProfileData {
  id: number;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  is_complete: boolean;
}

interface MedicalData {
  q1: string | null;
  q2: string | null;
  q2_details: string | null;
  q3: string | null;
  q3_details: string | null;
  q4: string | null;
  q4_details: string | null;
  q5: string | null;
  q5_details: string | null;
  q6: string | null;
  last_checkup: string | null;
  other_medical: string | null;
}

interface PrescriptionData {
  id: number;
  medications: string;
  diagnosis: string | null;
  instructions: string | null;
  image_url: string | null;
  prescribed_by: string;
  prescription_date: string;
}

function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob + 'T00:00:00');
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function PatientList() {
  const [patients, setPatients] = useState<PatientProfileData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientProfileData | null>(null);
  const [medicalData, setMedicalData] = useState<MedicalData | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionData[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    const { data } = await supabase
      .from('patient_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setPatients(data || []);
  }

  async function viewPatient(patient: PatientProfileData) {
    setSelectedPatient(patient);
    const [medRes, rxRes] = await Promise.all([
      supabase.from('medical_assessments').select('*').eq('user_id', patient.user_id).maybeSingle(),
      supabase.from('prescriptions').select('*').eq('user_id', patient.user_id).order('prescription_date', { ascending: false }),
    ]);
    setMedicalData(medRes.data);
    setPrescriptions(rxRes.data || []);
    setShowDetails(true);
  }

  const filteredPatients = patients.filter((p) => {
    const name = `${p.first_name || ''} ${p.middle_name || ''} ${p.last_name || ''}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Patients</h1>
        <p className="text-muted-foreground">View all registered patients and their records</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No patients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        {patient.first_name} {patient.middle_name || ''} {patient.last_name}
                      </TableCell>
                      <TableCell>
                        {patient.date_of_birth ? new Date(patient.date_of_birth + 'T00:00:00').toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {patient.date_of_birth ? calculateAge(patient.date_of_birth) : 'N/A'}
                      </TableCell>
                      <TableCell>{patient.gender || 'N/A'}</TableCell>
                      <TableCell>{patient.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={patient.is_complete ? 'confirmed' : 'pending'}>
                          {patient.is_complete ? 'Complete' : 'Incomplete'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => viewPatient(patient)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Patient Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPatient?.first_name} {selectedPatient?.middle_name || ''} {selectedPatient?.last_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Profile Info */}
            <div>
              <h3 className="font-semibold text-foreground mb-2">Personal Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                {selectedPatient?.date_of_birth && (
                  <>
                    <div><span className="text-muted-foreground">Date of Birth:</span> {new Date(selectedPatient.date_of_birth + 'T00:00:00').toLocaleDateString()}</div>
                    <div><span className="text-muted-foreground">Age:</span> {calculateAge(selectedPatient.date_of_birth)}</div>
                  </>
                )}
                <div><span className="text-muted-foreground">Gender:</span> {selectedPatient?.gender || 'N/A'}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedPatient?.phone || 'N/A'}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {selectedPatient?.address || 'N/A'}</div>
              </div>
            </div>

            {/* Medical History */}
            {medicalData && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">Medical History</h3>
                <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-lg">
                  <div><span className="text-muted-foreground">Currently taking medications?</span> {medicalData.q1 || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Allergies?</span> {medicalData.q2 || 'N/A'} {medicalData.q2_details ? `- ${medicalData.q2_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Medical conditions?</span> {medicalData.q3 || 'N/A'} {medicalData.q3_details ? `- ${medicalData.q3_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Previous surgeries?</span> {medicalData.q4 || 'N/A'} {medicalData.q4_details ? `- ${medicalData.q4_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Pregnant or nursing?</span> {medicalData.q5 || 'N/A'} {medicalData.q5_details ? `- ${medicalData.q5_details}` : ''}</div>
                  <div><span className="text-muted-foreground">Bleeding disorders?</span> {medicalData.q6 || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Last dental checkup:</span> {medicalData.last_checkup ? new Date(medicalData.last_checkup + 'T00:00:00').toLocaleDateString() : 'N/A'}</div>
                  {medicalData.other_medical && <div><span className="text-muted-foreground">Other:</span> {medicalData.other_medical}</div>}
                </div>
              </div>
            )}

            {/* Prescriptions */}
            <div>
              <h3 className="font-semibold text-foreground mb-2">Prescriptions</h3>
              {prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prescriptions yet</p>
              ) : (
                <div className="space-y-2">
                  {prescriptions.map((rx) => (
                    <div key={rx.id} className="bg-muted/50 p-3 rounded-lg text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-foreground">{rx.prescribed_by}</span>
                        <span className="text-muted-foreground">{new Date(rx.prescription_date + 'T00:00:00').toLocaleDateString()}</span>
                      </div>
                      {rx.image_url ? (
                        <a href={rx.image_url} target="_blank" rel="noopener noreferrer" className="block mt-2 rounded-lg overflow-hidden border border-border/50 hover:border-secondary/50 transition-colors">
                          <img src={rx.image_url} alt="Prescription" className="w-full max-h-48 object-contain bg-white" />
                          <div className="text-center py-1 text-xs text-secondary bg-muted/30">Click to view full size</div>
                        </a>
                      ) : (
                        <>
                          {rx.diagnosis && <div><span className="text-muted-foreground">Diagnosis:</span> {rx.diagnosis}</div>}
                          <div><span className="text-muted-foreground">Medications:</span> {rx.medications}</div>
                          {rx.instructions && <div><span className="text-muted-foreground">Instructions:</span> {rx.instructions}</div>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
