const clipsContainer = document.getElementById("clipsContainer")
const imagePicker = document.getElementById("imagePicker")
const audioInput = document.getElementById('audioInput')
const audioPlayer = document.getElementById('audioPlayer')
const transcribeButton = document.getElementById('transcribeButton')
const fxDropdown = document.getElementById("fxDropdown")

const availableFx = ["fade_in", "fade_out", "black_and_white"]
let clips = []

// get clips from local storage
function retrieveClips(){
  if(audioInput.files[0] == undefined){
    alert("You must introduce the corresponding audio before importing the clips.")
    return;
  }
  if(localStorage.getItem('clips') != null){
    clips = JSON.parse(localStorage.getItem('clips'));
    refreshClips();
  } else {
    alert("No clips available in local storage!")
  }
}

async function createClip(clipIndex){
  var previousClipStart = clips[clipIndex]['start'];
  var nextClipStart;
  if(clipIndex != clips.length - 1){ // if not last clip
    nextClipStart = clips[clipIndex + 1]['start'];
  } else {
    nextClipStart = await getAudioDuration()
  }


  // add new clip to array
  const newClip = {
    imageDescription:prompt('Input the image description:'),
    start:(previousClipStart + nextClipStart) / 2, // in the middle
  }
  clips.splice(clipIndex + 1, 0, newClip)

  refreshClips()

}

async function loadImages(specificClip=null){
  if(specificClip == null){
      // reset all
      console.info('Refreshing all images')
      startIndex = 0
      endIndex = clips.length
    } else {
      console.info('Refreshing specific image')
      startIndex = specificClip
      endIndex = specificClip + 1
    }

    for (let index = startIndex; index < endIndex; index++) {
      const imageDescription = clips[index]['imageDescription']

      var imageLink;
      if(clips[index]['imageLink'] == undefined){
        imageLink = await getImageLinks(imageDescription, 1)
        imageLink = imageLink[0]
      } else {
        imageLink = clips[index]['imageLink']
      }
      const clipImg = document.getElementById(`clip${index}`).querySelector(".clipPreview").children[0]
      clipImg.src = imageLink
      clipImg.id = `clip${index}image`

      // assign image link to clip
      clips[index]['imageLink'] = imageLink
    }
}

async function refreshClips(specificClip=null){
  if(clips.length == 0){
    console.info('No clips to refresh')
    return;
  }
  // clip component is in index.html
  const component = document.getElementById('clip')

    if(specificClip == null){
      // reset all
      console.info('Refreshing all clips')
      clipsContainer.innerHTML = ''
      startIndex = 0
      endIndex = clips.length
    } else {
      console.info('Refreshing specific clip')
      startIndex = specificClip
      endIndex = specificClip + 1
    }



    for (let index = startIndex; index < endIndex; index++) {
        let newClip;

        // create/choose the clip element and add it 
        if(specificClip == null){
          newClip = component.cloneNode(true);
          newClip.style.display = 'inline-block'
          newClip.id = `clip${index}`
          clipsContainer.appendChild(newClip)
        } else {
          newClip = document.getElementById(`clip${index}`)
        }

        // add paragraph to show the image description
        const imageDescription = clips[index]['imageDescription']
        newClip.querySelector(".imageDescription").innerText = imageDescription
        
        // add time indicator
        const clipStart = clips[index]['start']
        const seconds = Math.floor(clipStart)
        const milliseconds = Math.round((clipStart - Math.floor(clipStart)) * 1000)
        const formattedSeconds = seconds > 9 ? seconds : `0${seconds}`
        const formattedMilliseconds = milliseconds > 99 ? milliseconds : (milliseconds > 9 ? `0${milliseconds}` : `00${milliseconds}`) 
        newClip.querySelector('span > .clipTiming').innerText = `${formattedSeconds}.${formattedMilliseconds}`

        // save function names
        const buttons = ["changeClipTime", "showImageOptions", "changeImageDescription", "createClip", "replaceImage", "goTo", "convertToYT", "removeClip"]
        // apply functions to buttons
        for (let buttonIndex = 0; buttonIndex < buttons.length; buttonIndex++) {
          const buttonName = buttons[buttonIndex];
          const buttonElem = newClip.querySelector(`.${buttonName}Button`)
          buttonElem.setAttribute("onclick", `${buttonName}(${index})`)
          // add icon
          const newIcon = document.createElement('img')
          newIcon.src = `icons/${buttonName}.svg`
          newIcon.alt = buttonName
          buttonElem.prepend(newIcon)
        }

        // remove change clip start button from first clip
        if(index == 0){
          newClip.querySelector(".changeClipTimeButton").remove()
        }

        // yt link
        const YTLink = newClip.querySelector('.convertToYTLink')
        const YTQuery = clips[index]['videoDescription'] != undefined ? clips[index]['videoDescription'] : clips[index]['imageDescription']
        YTLink.setAttribute('href', `https://www.youtube.com/results?search_query=${encodeURIComponent(YTQuery)}`)
    
        // add effects to fxForm
        const fxForm = newClip.querySelector('.fxForm')
        fxForm.innerHTML = ''
        for (let fxIndex = 0; fxIndex < availableFx.length; fxIndex++) {
          const fx = availableFx[fxIndex];
          const formattedName = fx.replaceAll("_", " ")
          let newWrap = document.createElement("div")
          let newLabel = document.createElement('label')
          let newCheckBox = document.createElement('input')
          let newIcon = document.createElement("img")

          fxForm.appendChild(newWrap)

          // place info in elements
          newIcon.src = `icons/${fx}.svg`
          newIcon.alt = formattedName

          newLabel.innerText = formattedName
          newLabel.setAttribute('for', `${fx}${index}`)

          newCheckBox.type = "checkbox"
          newCheckBox.name = `${fx}${index}`
          newCheckBox.id = `${fx}${index}`


          // add to form
          newWrap.appendChild(newIcon)
          newWrap.appendChild(newLabel)
          newWrap.appendChild(newCheckBox)
          newWrap.appendChild(document.createElement('br'))
        }
      }


    loadImages(specificClip);
}

async function showImageOptions(clipId){
  // reset image picker
  imagePicker.innerHTML = ''
  const imageDescription = clips[clipId]['imageDescription']
  const clipImages = await getImageLinks(imageDescription, 12)

  for (let index = 0; index < clipImages.length; index++) {
        // create img element
        const clipImg = document.createElement('img')
        clipImg.src = clipImages[index]
        clipImg.id = `clipSuggestion${index}`
        clipImg.setAttribute('onclick', `assignImage(${index}, ${clipId})`)
        imagePicker.appendChild(clipImg)
    }
}

async function getImageLinks(query, limit) {
  const res = await fetch(`http://localhost:8000/images?q=${query}&l=${limit}`);
  const links = await res.json();
  return links;
}

// assign image found in image options
function assignImage(imageSuggestionId, clipId){
  const url = document.getElementById(`clipSuggestion${imageSuggestionId}`).src
  // assign image link to clip
  clips[clipId]['imageLink'] = url
  // display it
  document.getElementById(`clip${clipId}image`).src = url
}

function changeImageDescription(clipId){
  const newImageDescription = prompt('Input a new image description: ', clips[clipId]['imageDescription'])
  if(newImageDescription == null) { // user presses cancel
    return;
  }
  clips[clipId]['imageDescription'] = newImageDescription
  clips[clipId]['imageLink'] = undefined
  loadImages(clipId)
}

async function exportVideo(){
  // add the effects to each clip, taken from 'options' effect selector
  for (let index = 0; index < clips.length; index++) {
    const form = document.getElementById(`clip${index}`).querySelector(".fxForm")
    clips[index]['effects'] = Array.from(form.querySelectorAll('div input[type="checkbox"]:checked')).map(cb => cb.name.replace(/\d+/g, ''));
  }
  // send the project
  const res = await fetch('http://localhost:8000/export',
    {
      body:JSON.stringify({
        'project':clips,
      }),
      method:'POST',
      headers:{
        'Content-Type':'application/json'
      }
    }
  )
  if(res.ok){
    alert('Project exported correctly')
  } else {
    alert('An error came up…')
  }
}

async function getAudioDuration() {
  const file = audioInput.files[0]
  return new Promise((resolve, reject) => {
    if (!file) return reject("there is no file");

    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.src = url;

    audio.onloadedmetadata = () => {
      resolve(parseFloat(audio.duration.toFixed(3)));
      URL.revokeObjectURL(url); 
    };

    audio.onerror = () => reject("error reading audio");
  });
}

async function transcribe() {
  const url = "http://localhost:8000/transcribe";
  const formData = new FormData();
  formData.append("audio", audioInput.files[0]);

  // get audio duration
  const audioDuration = await getAudioDuration();

  // calculate estimated time
  const ET = Math.floor(1.64 * audioDuration) // coefficient taken from excel time comparison table

  // start a counter
  const start = Math.floor(Date.now() / 1000)
  transcribeButton.disabled = true;
  audioInput.disabled = true;
  const countdown = setInterval(()=>{
    let timeNow = Math.floor(Date.now() / 1000)
    let seconds = timeNow - start
    transcribeButton.innerText = `Processing... ${seconds} seconds, ET: ${ET} seconds`

    if(seconds % 10 == 0){
      console.info(`Seconds lapsed: ${seconds}`)
    }
  }, 1000)
  

  const res = await fetch(url, {
    body:formData,
    method:'POST',
  })
  .catch(
    ()=>{
      clearInterval(countdown)
      alert('An error came up…')
    }
  )

  // remove the counter and enable the button again
  transcribeButton.innerText =  'Transcribe audio and generate images'
  transcribeButton.disabled = false;
  audioInput.disabled = false;
  clearInterval(countdown)


  if(res.ok){
    json = await res.json()
    clips = json['project']
    console.log(clips)
    localStorage.setItem("clips", JSON.stringify(clips))
    refreshClips();
  } else {
    alert('An error came up…')
  }

}

// audio player appears when audio is given by the user
audioInput.addEventListener("change", () => {
    const audio = audioInput.files[0];
    if (audio) {
      const url = URL.createObjectURL(audio);
      audioPlayer.src = url;
    }
});

// change start time of a clip
async function changeClipTime(clipIndex){
  if(clipIndex == 0) return; // if first clip

  let max;
  if(clipIndex == clips.length - 1){ // if last clip
    max = await getAudioDuration()
  } else {
    max = clips[clipIndex + 1]['start']
  }
  let min =  clips[clipIndex - 1]['start']
  
  // get data from prompt and validate
  let start = prompt("Input time in format ss.mmm")
  if(start == null){ // user pressed cancel
    return;
  }
  start = parseFloat(start)
  if(Number.isNaN(start)){
    alert("Please input the time in the specified format.")
    return;
  }

  // if valid, assign
  if(max > start && min < start){
    clips[clipIndex]['start'] = start
  }  else {
    alert("Can't assign clip start superior to next clip start time or inferior to previous clip start time.")
    return;
  }

  refreshClips(clipIndex)
}

function replaceImage(clipIndex){
  const newUrl = prompt("Input the new image URL:")
  clips[clipIndex]["imageDescription"] = "Custom image"
  clips[clipIndex]["imageLink"] = newUrl
  loadImages(clipIndex);
}

// make player go to moment where clip starts
function goTo(clipIndex){
  console.log('going')
  audioPlayer.currentTime = clips[clipIndex]['start']
  audioPlayer.play()

  // stop audio when clip concludes
  if(clipIndex < clips.length - 1){
    setTimeout(()=>{
      audioPlayer.pause()
    }, (clips[clipIndex + 1]['start'] - clips[clipIndex]['start']) * 1000)
  }
}

function convertToYT(clipIndex){
  const clipPreview = document.getElementById(`clip${clipIndex}`).querySelector('.clipPreview')
  var YTvideoLink = prompt("Input a YouTube video link");
  if(YTvideoLink == undefined) return; // if user presses cancel
  YTvideoLink = new URL(YTvideoLink)
  // get time
  let YTstart = prompt('Input YouTube video start time in format MM:ss')
  if (YTstart == undefined) return; // if user presses cancel
  YTstart = YTstart.split(':')
  if(YTstart.length != 2){
    alert("Please input YouTube video start in format MM:ss")
    return;
  }
  if(Number.isNaN(parseInt(YTstart[0])) || Number.isNaN(parseInt(YTstart[1]))){
    alert("Please input digits in format MM:ss")
    return;
  }
  // convert time to seconds
  YTstart = parseInt(YTstart[0]) * 60 + parseInt(YTstart[1])

  // enter other video info(s) and remove unnecessary ones
  clips[clipIndex]['YTvideoLink'] = YTvideoLink
  clips[clipIndex]['YTstart'] = YTstart
  clips[clipIndex]['imageDescription'] = null
  clips[clipIndex]['imageLink'] = null

  // adapt YouTube link to iframe
  // add a time stamp for the iframe
  YTvideoLink = new URL(`https://www.youtube.com/embed/${YTvideoLink.searchParams.get('v')}`)
  YTvideoLink.searchParams.append('start', YTstart);
  //todo: YTvideoLink.searchParams.append('end', clips[clipIndex]['YTstart'] + );
  
  // create the iframe
  clipPreview.innerHTML = ''
  let iframe = document.createElement('iframe')
  iframe.setAttribute('src', YTvideoLink.toString())
  clipPreview.appendChild(iframe)
}

// add/remove specific effect from all clips 
function generalFx(fx, checkboxValue){
  for (let index = 0; index < clips.length; index++) {
    const checkbox = document
      .getElementById(`clip${index}`)
      .querySelector(`.fxForm > div > input[type="checkbox"][name="${fx + index}"]`);
    
    if (checkbox) {
      checkbox.checked = checkboxValue;
    }
  }
}


// When the user clicks on the button, toggle between hiding and showing the dropdown content
function generalFxDropdownToggle() {
  fxDropdown.classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.matches('.dropdownButton')) {
    var dropdowns = document.getElementsByClassName("dropdownContent");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}




// create toggle buttons for general fx dropdown
for (let index = 0; index < availableFx.length; index++) {
  const fx = availableFx[index];
  const formattedName = fx.replaceAll("_", " ")
  let newApplyButton = document.createElement('button')
  let newRemoveButton = document.createElement('button')

  newApplyButton.innerText = `Apply '${formattedName}' to all clips`
  newRemoveButton.innerText = `Remove '${formattedName}' from all clips`

  newApplyButton.setAttribute('onclick', `generalFx('${fx}', true)`)
  newRemoveButton.setAttribute('onclick', `generalFx('${fx}', false)`)

  fxDropdown.appendChild(newApplyButton)
  fxDropdown.appendChild(newRemoveButton)
}


function removeClip(clipIndex){
  if(clips.length == 1){
    alert("Video should have at least one clip")
    return;
  }
  // if first clip, the second clip should then start at 0 timestamp
  clips.splice(clipIndex, 1);
  if(clipIndex == 0){
    clips[clipIndex]['start'] = 0
  refreshClips();
  } 
}