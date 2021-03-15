function create_quizzes_main(action_flag) {
  //action flag: 1 = create_quiz; 2 = increase_right_answers
  //get active spreadsheet data
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();
  const ss = sheet.getDataRange().getValues();

  //set form title and questions about test-taker's IDs
  //cf. locations are fixed.
  const form_title = ss[0][1];
  const form_title_description = ss[0][4];
  const test_taker_ID_title = ss[2][1];
  const test_taker_ID_description = ss[2][2];
  const test_taker_name_title = ss[3][1];
  const test_taker_name_description = ss[3][2];
  if (ss[0][6] == 'Quiz'||ss[0][6] == 'quiz') { 
    var j = 1; 
  } else { 
    var j = 0; 
  }
  const quiz_flag = j; 
  const c_item = 5; // starting column of the multiple choice values or right answers data
  const c_type = 1; // itemtype column
  const c_points = 2; // points column
  const c_image = 3; // image ID or URL column
  const c_description = 4; // helptext column
  const r_data = 7; // starting row of data

  //create form
  if (action_flag === 1) {
    var form = FormApp.create(form_title);
    form.setIsQuiz(isTest_(quiz_flag));
    form.setDescription(form_title_description);
    //test-taker's IDs
    form.addTextItem().setTitle(test_taker_ID_title).setHelpText(test_taker_ID_description).setRequired(true);
    form.addTextItem().setTitle(test_taker_name_title).setHelpText(test_taker_name_description).setRequired(true);
  }

  //moveFile to users' folder where the spreadsheet is in
  const sheet_id = spreadsheet.getId();
  const sheet_folder = DriveApp.getFileById(sheet_id).getParents().next();
  const sheet_folder_id = sheet_folder.getId();
  const form_file = DriveApp.getFileById(form.getId());
  form_file.moveTo(sheet_folder);

  //how many times you create quizzes
  var numbers_of_quizzes = 1;
    for (let j = sheet.getLastRow() - r_data; j > 0; j--) {
      if ( ss[j][1] !== '' && ss[j][1] !== undefined) {
        var numbers_of_quizzes = j - r_data + 1;
        break;
      } 
    }

  //loop
  for (let i = 0; i < numbers_of_quizzes; i++) {
    var line = ss[i + r_data];
    var type = line[c_type];
    
    //get the end of the column -> numbers_of_last_items
    var numbers_of_last_items = 0;
    for (let j = line.length; j > 0; j--) {
      if ( line[j] !== '' && line[j] !== undefined) {
        var numbers_of_last_items = j - c_item - quiz_flag;
        break;
      } 
    }

    // get first item and last item of test/questionnaire 
    var firstitem = line[c_item];
    var lastitem = line[c_item + numbers_of_last_items + quiz_flag];
    //console.log('lastitem: '+lastitem);
    
    //create quiz
    if (action_flag === 1) {
      if (type == 'Text'||type == 'TEXT') {
        //if any image, set image item
        setimage_(form, line, c_image, sheet_folder_id);

        //create a text quiz (only form items, currently you cannot set answer keys)
        item = form.addTextItem()
                   .setTitle(line[c_description]);

        var multiple_choice_flag = false;
          
      } else if (type == 'MultipleChoice'||type == 'Multiple Choice') {
        //if any image, set image item
        setimage_(form, line, c_image, sheet_folder_id);

        //create a multiplechoice quiz
        var choicevalues = line.slice(c_item, c_item + numbers_of_last_items + 1);
        item = form.addMultipleChoiceItem()
                   .setTitle(line[c_description]);
        if (isTest_(quiz_flag)) {
          //array for setChoices.createChoice
          var arr = [item.createChoice(choicevalues[0],true)];
          for (let j = 1; j < choicevalues.length; j++) {
            arr.push(item.createChoice(choicevalues[j],false));
          }
          //shuffle
          var a = arr.length;
          while (a) {
            var j = Math.floor( Math.random() * a );
                var t = arr[--a];
                arr[a] = arr[j];
                arr[j] = t;
          }
          item.setChoices(arr);
        } else {
          item.setChoiceValues(choicevalues);
        }

        var multiple_choice_flag = true;

      }

      //set points
      setpoint_(item, line, quiz_flag, c_points);

      //set feedback
      setfeedback_(item, lastitem, quiz_flag, multiple_choice_flag);

    //increase right answers
    } else if (action_flag === 2) {
        if (type == 'Text'||type == 'TEXT') {
          var itemlist = line.slice(c_item, c_item + numbers_of_last_items + 1);      
          var arr = [];
  
          //preprocessing
          for (j=0; j<itemlist.length; j++) {
            itemlist[j] = itemlist[j].trim();
            if (itemlist[j].charAt(itemlist[j].length-1) === '.') {
              itemlist[j] = itemlist[j].slice(0, itemlist[j].length-1);
            }
            itemlist[j] = itemlist[j].charAt(0).toLowerCase() + itemlist[j].slice(1);
            //console.log(itemlist[j]);
          }
          //unique
          itemlist = Array.from(new Set(itemlist))
          //console.log('itemlist: '+itemlist);
  
          //set increased array
          //without dot
          var dot='';
          increaseitems_(arr, itemlist, dot);
          //with dot
          var dot='.';
          increaseitems_(arr, itemlist, dot);

          //splice item which equals to the first item
          for (j=0; j<arr.length; j++) {
            if (arr[j] === firstitem) {
              arr.splice(j, 1); 
              //console.log(j);
            }
          }

          //unshift the firstitem, the right answer, and push the lastitem, feedback
          arr.unshift(firstitem);
          arr.push(lastitem);
          var arr = [arr];
          //console.log('arr: '+arr);

          //set array on the spreadsheet
          //console.log(i);
          sheet.getRange(r_data + i + 1, c_item + 1, 1, arr[0].length).setValues(arr);
        }

    }
    
    //console.log(type);
    //console.log('numbers_of_last_items: '+numbers_of_last_items);
  }

  //console.log(numbers_of_quizzes);
  //console.log(ss)
}

function isTest_ (value) {
  return value === 1
}

function isNaN_ (value) {
  return typeof value === 'number' && value !== value
}

function setimage_ (form, line, c_image, sheet_folder_id) {
      //set a image to this quiz
      var imagelocation = line[c_image];
      var img = '';
      if (imagelocation !== '') {
        if (imagelocation.slice(0,4) !== 'http'){
          //image by ID
          if (imagelocation.length > 32) {
            img = DriveApp.getFileById(imagelocation).getBlob();
          } else {
          //image by file name
            var key = sheet_folder_id;
            var folders = DriveApp.searchFolders("'"+key+"' in parents");
            img = check_file_(folders, key, imagelocation);
            if ( img == '' ) {
              while (folders.hasNext()) {
                 key = folders.next().getId()
                 img = check_file_(folders, key, imagelocation);    
                 if ( img != '' ) {
                   break;
                 }
              } 
            }
          }
        } else {
          //image by google drive URL
          if (imagelocation.slice(0,29) == 'https://drive.google.com/file'){
          var s_start = imagelocation.indexOf('/d/');
          var image_id = imagelocation.slice(s_start+3, imagelocation.length); 
          var s_end = image_id.indexOf('/');
          if (s_end != -1) {
            image_id = image_id.slice(0,s_end);
          }
          img = DriveApp.getFileById(image_id).getBlob();
          } else {
          //image by world wide web
          var img = UrlFetchApp.fetch(imagelocation);
          }
        }
        if ( img != '' ) {
          form.addImageItem().setImage(img).setAlignment(FormApp.Alignment.CENTER);
        } 

      }
}

function check_file_(folders, key, imagelocation) {
              var img = '';
              //var fileList = DriveApp.getFolderById(sheet_folder_id).getFiles();
              var fileList = DriveApp.searchFiles("'"+key+"' in parents");
              while (fileList.hasNext()) {
                var check_file = fileList.next();
                if (check_file.getName() === imagelocation) {
                  img = DriveApp.getFileById(check_file.getId()).getBlob();
                }
              } 
              return img
}

function setpoint_ (item, line, quiz_flag, c_points) {
      //set a point to this quiz
      if (isTest_(quiz_flag)) {
        var point = line[c_points];
        if (typeof point == 'string') {
          var point = parseInt(line[c_points]);
        }
        if (isNaN_(point)){
          var point = 0;
        }
        if (point != 0) {
          item.setPoints(point);
        }
      }
}

function setfeedback_ (item, lastitem, quiz_flag, multiple_choice_flag) {
      //set feedback
      if (isTest_(quiz_flag)) {
        var feedback = FormApp.createFeedback().setText(lastitem);
        if (multiple_choice_flag) {
          item.setFeedbackForCorrect(feedback.build())
              .setFeedbackForIncorrect(feedback.build());
        } else {
          item.setGeneralFeedback(feedback.build());
        }
      }
}

function increaseitems_ (arr, itemlist, dot) {
          for (j=0; j<itemlist.length; j++) {
          //lower capital
          t = itemlist[j]+dot
          arr.push(t);
          //upper capital
          t = itemlist[j].charAt(0).toUpperCase() + itemlist[j].slice(1)+dot;
          arr.push(t);
        }
}