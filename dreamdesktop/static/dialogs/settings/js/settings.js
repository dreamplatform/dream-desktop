$(document).ready(function(){

	$(".picUploader").live('click',function(){
		var img_src = $('#imgUrlInput').val();
		$.post('/settings/upload/',{img_url:img_src})
		.success(function(data){
			console.log(data);
			window.location.reload();
		})
		.error(function(data){
		});
	});

	$(".addremList.group .action").live('click',function(){
		var split_id = $(this).attr('id').split('_');
        var type = split_id[0];
        var id = split_id[1];
        var action;
        if ($(this).hasClass('add')){
            action = "join";
        }
        else{
            action = "part";
        }
        $.post('/settings/'+action+'/',{target_type:type, target_id:id})
        .success(function(data){
            window.location.reload();
        })
        .error(function(data){
        });
    });

	$(".orgFilter").live('click',function(){
		var sourceClasses = $(this).attr("class");
		var identifier;
		var parentContainer;
        var activeFilters;
		var filterContainerItems;
		if (sourceClasses.indexOf('filterRoles') >= 0){
			identifier = '.role';
			parentContainer = '#userRoles';
            activeFilters = $('#filtersOrgRole').children();
            filterContainerItems = '#filtersOrgRole a.active';
		}
		if (sourceClasses.indexOf('filterGroups')>=0){
			identifier = '.group';
			parentContainer = '#userGroups';
            activeFilters = $('#filtersOrgGroup').children();
            filterContainerItems = '#filtersOrgGroup a.active';
		}
        
		var children = $(parentContainer).find(identifier).children();
        var any_selected = false;

        if($(filterContainerItems).length > 0){        
            for(i=0;i<children.length;i++){
		        $(children[i]).hide();
		        var relatedOrg = $(children[i]).find('input').val();
		        for(j=0;j<activeFilters.length;j++){
		            if($(activeFilters[j]).hasClass('active')){
                        any_selected = true;
		                var input = $(activeFilters[j]).find('input').val();
				        if(input == relatedOrg){
				            $(children[i]).show();
                        }
                    }
                }
            }
        }else{
            for(i=0;i<children.length;i++){
		        $(children[i]).show();
            }
        }
	});

	$(".settingsSearchbox").live('keyup',function(event){
		var searchSource = $(this).attr("id");
		var search_str = $(this).attr("value");
		var identifier = null;
		if(searchSource == 'searchBoxOrg'){
			identifier = '.org';
		}
		if(searchSource == 'searchBoxRole'){
			identifier = '.role';
		}
		if(searchSource == 'searchBoxGroup'){
			identifier = '.group';
		}
		var children = $('.addremList').find(identifier);
		for(i = 0; i < children.length; i++){
			var text = $($(children[i])).find('.text').text();
			if(text.toLowerCase().indexOf(search_str.toLowerCase()) >= 0){
				$(children[i]).fadeIn(500);
			}else{
				$(children[i]).fadeOut(500);
			}
		}
	});

	$(".saveUserInfo").live('click',function(){
		var email = $('#userEmailField').attr("value");
		var phone = $('#userPhoneField').attr("value");
		if (email == ''){
			email = null
		}
		if(phone == ''){
			phone = null
		}
		$.post('/settings/userinfo/',{user_email:email, user_phone:phone})
		.success(function(data){
			$(".alertError").fadeOut(0);
			$(".alertSuccess").fadeIn(200);
		})
		.error(function(data){
			$(".alertSuccess").fadeOut(0);
			$(".alertError").fadeIn(200);
		});

	});

	$(".editPwLink a").live('click',function(){
		$("#userPwCurrentField").val('');
		$("#userPwNewField").val('');
		$("#userPwNewReField").val('');
		$(".alertError").hide();
		$(".alertSuccess").hide();
	});

	$(".changePwBtn").live('click',function(){
		var old = $('#userPwCurrentField').attr("value");
		var new1 = $('#userPwNewField').attr("value");
		var new2 = $('#userPwNewReField').attr("value");
		if (old != "" && new1 != "" && new2 != ""){
			$.post('/settings/password/',{old_pw:old, new_first:new1,new_rep:new2})
			.success(function(data){
				$("#editPw .alertError").fadeOut(0);
				$("#editPw .alertSuccess").fadeIn(200);
			})
			.error(function(data){
				$("#editPw .alertSuccess").fadeOut(0);
				$("#editPw .alertError").fadeIn(200);
			});
		}else{
			$(".alertError").fadeIn(200);
		}
	});
});
