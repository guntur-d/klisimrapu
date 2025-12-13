#!/usr/bin/env node

import mongoose from 'mongoose';
import Pejabat from '../models/Pejabat.js';
import SubPerangkatDaerah from '../models/SubPerangkatDaerah.js';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

async function fixPositionConflicts() {
  try {
    console.log('🔧 Starting position conflict cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Get all sub organizations
    const subOrganizations = await SubPerangkatDaerah.find({});
    console.log(`📋 Found ${subOrganizations.length} sub organizations`);
    
    // Create a mapping of sub org names to IDs
    const subOrgNameToId = {};
    subOrganizations.forEach(org => {
      subOrgNameToId[org.nama] = org._id;
    });
    
    // Find all officials with Jabatan Struktural positions
    const allPejabat = await Pejabat.find({});
    console.log(`👥 Found ${allPejabat.length} pejabat records`);
    
    // Track conflicts and resolutions
    const conflicts = [];
    const resolutions = [];
    
    // Step 1: Find position conflicts
    console.log('\n🔍 Scanning for position conflicts...');
    
    for (const pejabat of allPejabat) {
      // Check both new format (jabatanStrukturalList) and legacy format (jabatanStruktural)
      const positions = [];
      
      if (pejabat.jabatanStrukturalList && pejabat.jabatanStrukturalList.length > 0) {
        // New format
        positions.push(...pejabat.jabatanStrukturalList.filter(pos => pos.isActive));
      }
      
      if (pejabat.jabatanStruktural) {
        // Legacy format - convert to list format
        const subOrg = Object.keys(subOrgNameToId).find(name => 
          pejabat.jabatanStruktural.includes(name)
        );
        
        if (subOrg) {
          positions.push({
            position: pejabat.jabatanStruktural,
            subOrganisasiId: subOrgNameToId[subOrg],
            isActive: true,
            assignedAt: new Date()
          });
        } else {
          // If we can't find matching sub org, mark as inactive
          positions.push({
            position: pejabat.jabatanStruktural,
            subOrganisasiId: null,
            isActive: false,
            assignedAt: new Date()
          });
        }
      }
      
      // Check each position for conflicts
      for (const position of positions) {
        if (!position.isActive || !position.position) continue;
        
        // Extract role from position
        const isKepala = position.position.startsWith('Kepala ');
        const isPltKepala = position.position.startsWith('Plt. Kepala ');
        
        if (isKepala || isPltKepala) {
          // Find all other pejabat with the same position
          const conflictingPejabat = allPejabat.filter(p => {
            if (p._id.toString() === pejabat._id.toString()) return false;
            
            // Check new format
            if (p.jabatanStrukturalList && p.jabatanStrukturalList.length > 0) {
              return p.jabatanStrukturalList.some(pos => 
                pos.isActive && pos.position === position.position
              );
            }
            
            // Check legacy format
            return p.jabatanStruktural === position.position;
          });
          
          if (conflictingPejabat.length > 0) {
            conflicts.push({
              position: position.position,
              currentPejabat: pejabat.nama,
              currentPejabatId: pejabat._id,
              conflictingPejabat: conflictingPejabat.map(p => p.nama),
              conflictingPejabatIds: conflictingPejabat.map(p => p._id),
              conflictType: isKepala ? 'Kepala' : 'Plt. Kepala'
            });
          }
        }
      }
    }
    
    console.log(`🚨 Found ${conflicts.length} position conflicts`);
    
    // Step 2: Resolve conflicts by keeping the first occurrence
    console.log('\n🛠️  Resolving conflicts...');
    
    // Group conflicts by position to process them systematically
    const conflictsByPosition = {};
    conflicts.forEach(conflict => {
      if (!conflictsByPosition[conflict.position]) {
        conflictsByPosition[conflict.position] = [];
      }
      conflictsByPosition[conflict.position].push(conflict);
    });
    
    for (const [position, positionConflicts] of Object.entries(conflictsByPosition)) {
      console.log(`\n📍 Processing position: ${position}`);
      
      // Sort by conflict type priority (Kepala takes precedence over plt. Jefe)
      positionConflicts.sort((a, b) => {
        if (a.conflictType === 'Kepala' && b.conflictType === 'Plt. Kepala') return -1;
        if (a.conflictType === 'Plt. Kepala' && b.conflictType === 'Kepala') return 1;
        return 0;
      });
      
      // Keep the first conflict's currentPejabat, mark all others as inactive
      const keepPejabat = positionConflicts[0].currentPejabatId;
      const conflictToResolve = positionConflicts.slice(1);
      
      console.log(`   ✅ Keeping: ${positionConflicts[0].currentPejabat}`);
      
      for (const conflict of conflictToResolve) {
        console.log(`   ❌ Removing position from: ${conflict.currentPejabat}`);
        
        // Find and update the pejabat
        const pejabatToUpdate = await Pejabat.findById(conflict.currentPejabatId);
        if (pejabatToUpdate) {
          // Update new format
          if (pejabatToUpdate.jabatanStrukturalList && pejabatToUpdate.jabatanStrukturalList.length > 0) {
            const positionIndex = pejabatToUpdate.jabatanStrukturalList.findIndex(
              pos => pos.position === position && pos.isActive
            );
            
            if (positionIndex !== -1) {
              pejabatToUpdate.jabatanStrukturalList[positionIndex].isActive = false;
            }
          }
          
          // Update legacy format if it matches
          if (pejabatToUpdate.jabatanStruktural === position) {
            pejabatToUpdate.jabatanStruktural = null;
          }
          
          await pejabatToUpdate.save();
          
          resolutions.push({
            position,
            removedFrom: conflict.currentPejabat,
            keptFor: positionConflicts[0].currentPejabat
          });
        }
      }
    }
    
    // Step 3: Summary
    console.log('\n📊 RESOLUTION SUMMARY');
    console.log('====================');
    console.log(`✅ Total conflicts found: ${conflicts.length}`);
    console.log(`🔧 Total positions removed: ${resolutions.length}`);
    console.log('\n📋 Resolution details:');
    
    resolutions.forEach(resolution => {
      console.log(`   • "${resolution.position}": Removed from ${resolution.removedFrom}, kept for ${resolution.keptFor}`);
    });
    
    // Step 4: Verify no conflicts remain
    console.log('\n🔍 Verifying conflict resolution...');
    
    const finalPejabat = await Pejabat.find({});
    let remainingConflicts = 0;
    
    for (const pejabat of finalPejabat) {
      const positions = [];
      
      if (pejabat.jabatanStrukturalList && pejabat.jabatanStrukturalList.length > 0) {
        positions.push(...pejabat.jabatanStrukturalList.filter(pos => pos.isActive));
      }
      
      if (pejabat.jabatanStruktural) {
        positions.push({ position: pejabat.jabatanStruktural, isActive: true });
      }
      
      for (const position of positions) {
        if (!position.isActive || !position.position) continue;
        
        const isKepala = position.position.startsWith('Kepala ');
        const isPltKepala = position.position.startsWith('Plt. Kepala ');
        
        if (isKepala || isPltKepala) {
          const conflictingPejabat = finalPejabat.filter(p => {
            if (p._id.toString() === pejabat._id.toString()) return false;
            
            if (p.jabatanStrukturalList && p.jabatanStrukturalList.length > 0) {
              return p.jabatanStrukturalList.some(pos => 
                pos.isActive && pos.position === position.position
              );
            }
            
            return p.jabatanStruktural === position.position;
          });
          
          if (conflictingPejabat.length > 0) {
            remainingConflicts++;
            console.log(`🚨 STILL HAS CONFLICT: ${position.position} held by ${pejabat.nama} and ${conflictingPejabat[0].nama}`);
          }
        }
      }
    }
    
    if (remainingConflicts === 0) {
      console.log('✅ All conflicts successfully resolved!');
    } else {
      console.log(`⚠️  ${remainingConflicts} conflicts still remain. Manual review needed.`);
    }
    
    console.log('\n🎉 Position conflict cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPositionConflicts();
}

export default fixPositionConflicts;