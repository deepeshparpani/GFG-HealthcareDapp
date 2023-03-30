import { Box, Divider, FormControl, Modal, TextField, Typography, Backdrop, CircularProgress } from '@mui/material'
import React, { useCallback } from 'react'
import { useState } from 'react'
import CustomButton from '../../components/CustomButton'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import useEth from '../../contexts/EthContext/useEth'
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded'
import useAlert from '../../contexts/AlertContext/useAlert'
import AddRecordModal from './AddRecordModal'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import { CID } from 'multiformats/cid'
import {encode} from 'multibase'
// import ipfs from '../../ipfs'


import Record from '../../components/Record'

import { create } from "ipfs-http-client";

import { Buffer } from "buffer";

import { Build, HelpOutline } from '@mui/icons-material'
import multibase from 'multibase'


Buffer.from("anything", "base64");
window.Buffer = window.Buffer || require("buffer").Buffer;
const projectId = '2GyOc3HfYUMuUIPvXgb5NLzrdXt'
const projectSecret = '58f7b5a8386b557bf2c379ce204a58ca'        
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64')
const ipfs = create({
  host: 'ipfs.infura.io',
  port: 5001,
  apiPath: '/api/v0',

  protocol: 'https',
  headers: {
    authorization: auth,
    "Access-Control-Allow-Origin": ["*"],
    Origin: "https://ipfs.infura.io:5001",
  },
})






const Doctor = () => {
  const {
    state: { contract, accounts, role, loading },
  } = useEth()
  const { setAlert } = useAlert()

  const [patientExist, setPatientExist] = useState(false)
  const [searchPatientAddress, setSearchPatientAddress] = useState('')
  const [addPatientAddress, setAddPatientAddress] = useState('')
  const [records, setRecords] = useState([])
  const [addRecord, setAddRecord] = useState(false)

  const searchPatient = async () => {
    try {
      if (!/^(0x)?[0-9a-f]{40}$/i.test(searchPatientAddress)) {
        setAlert('Please enter a valid wallet address', 'error')
        return
      }
      const patientExists = await contract.methods.getPatientExists(searchPatientAddress).call({ from: accounts[0] })
      if (patientExists) {
        const records = await contract.methods.getRecords(searchPatientAddress).call({ from: accounts[0] })
        console.log('records :>> ', records)
        setRecords(records)
        setPatientExist(true)
      } else {
        setAlert('Patient does not exist', 'error')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const registerPatient = async () => {
    try {
      await contract.methods.addPatient(addPatientAddress).send({ from: accounts[0] })
    } catch (err) {
      console.error(err)
    }
  }
 
 



  const addRecordCallback = useCallback(  
     (buffer,fileName, patientAddress) => {
      if (!patientAddress) {
        setAlert('Please search for a patient first', 'error')
        return
      }
      const filedetails= {
        path: fileName,
        content: buffer,
      }
      
      async function addFile(){
        const res = await ipfs.add(buffer);
        
        const ipfsHash= res.path;
        console.log(ipfsHash)
        return ipfsHash
     }

     
     
      
     
      async function rec(ipfsHash){
        if (ipfsHash) {
          console.log(ipfsHash);
          await contract.methods.addRecord(ipfsHash,fileName, patientAddress).send({ from: accounts[0] })
          setAlert('New record uploaded', 'success')
          setAddRecord(false)
      
          // refresh records
          const records = await contract.methods.getRecords(patientAddress).call({ from: accounts[0] })
          setRecords(records)
        }
      } 

      try {
        async function fx(){
      const ipfsHash = await addFile();
      console.log(ipfsHash)
      rec(ipfsHash);
      }
      fx();
      
      } catch (err) {
        setAlert('Record upload failed', 'error')
        console.error(err)
      }
    },
    [addPatientAddress, accounts, contract]
  )

  if (loading) {
    return (
      <Backdrop sx={{ color: '#fff', zIndex: theme => theme.zIndex.drawer + 1 }} open={loading}>
        <CircularProgress color='inherit' />
      </Backdrop>
    )
  } else {
    return (
      <Box display='flex' justifyContent='center' width='100vw'>
        <Box width='60%' my={5}>
          {!accounts ? (
            <Box display='flex' justifyContent='center'>
              <Typography variant='h6'>Open your MetaMask wallet to get connected, then refresh this page</Typography>
            </Box>
          ) : (
            <>
              {role === 'unknown' && (
                <Box display='flex' justifyContent='center'>
                  <Typography variant='h5'>You're not registered, please go to home page</Typography>
                </Box>
              )}
              {role === 'patient' && (
                <Box display='flex' justifyContent='center'>
                  <Typography variant='h5'>Only doctor can access this page</Typography>
                </Box>
              )}
              {role === 'doctor' && (
                <>
                  <Modal open={addRecord} onClose={() => setAddRecord(false)}>
                    <AddRecordModal
                      handleClose={() => setAddRecord(false)}
                      handleUpload={addRecordCallback}
                      patientAddress={searchPatientAddress}
                    />
                  </Modal>

                  <Typography variant='h4'>Patient Records</Typography>
                  <Box display='flex' alignItems='center' my={1}>
                    <FormControl fullWidth>
                      <TextField
                        variant='outlined'
                        placeholder='Search patient by wallet address'
                        value={searchPatientAddress}
                        onChange={e => setSearchPatientAddress(e.target.value)}
                        InputProps={{ style: { fontSize: '15px' } }}
                        InputLabelProps={{ style: { fontSize: '15px' } }}
                        size='small'
                      />
                    </FormControl>
                    <Box mx={2}>
                      <CustomButton text={'Search'} handleClick={() => searchPatient()}>
                        <SearchRoundedIcon style={{ color: 'white' }} />
                      </CustomButton>
                    </Box>
                    <CustomButton text={'New Record'} handleClick={() => setAddRecord(true)} disabled={!patientExist}>
                      <CloudUploadRoundedIcon style={{ color: 'white' }} />
                    </CustomButton>
                  </Box>

                  {patientExist && records.length === 0 && (
                    <Box display='flex' alignItems='center' justifyContent='center' my={5}>
                      <Typography variant='h5'>No records found</Typography>
                    </Box>
                  )}

                  {patientExist && records.length > 0 && (
                    <Box display='flex' flexDirection='column' mt={3} mb={-2}>
                      {records.map((record, index) => (
                        <Box mb={2}>
                          <Record key={index} record={record} />
                        </Box>
                      ))}
                    </Box>
                  )}

                  <Box mt={6} mb={4}>
                    <Divider />
                  </Box>

                  <Typography variant='h4'>Register Patient</Typography>
                  <Box display='flex' alignItems='center' my={1}>
                    <FormControl fullWidth>
                      <TextField
                        variant='outlined'
                        placeholder='Register patient by wallet address'
                        value={addPatientAddress}
                        onChange={e => setAddPatientAddress(e.target.value)}
                        InputProps={{ style: { fontSize: '15px' } }}
                        InputLabelProps={{ style: { fontSize: '15px' } }}
                        size='small'
                      />
                    </FormControl>
                    <Box mx={2}>
                      <CustomButton text={'Register'} handleClick={() => registerPatient()}>
                        <PersonAddAlt1RoundedIcon style={{ color: 'white' }} />
                      </CustomButton>
                    </Box>
                  </Box>
                </>
              )}
            </>
          )}
        </Box>
      </Box>
    )
  }
}

export default Doctor
